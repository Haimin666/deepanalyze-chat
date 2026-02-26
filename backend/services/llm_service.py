import os
import re
import shutil
import json
import pypandoc
import openai
from pathlib import Path
from core.config import API_BASE, MODEL_PATH, Chinese_matplot_str
from services.workspace_service import get_session_workspace, uniquify_path, execute_code_safe, build_download_url, \
    collect_file_info

client = openai.OpenAI(base_url=API_BASE, api_key="dummy")


def fix_code_block(content):
    def fix_text(text):
        stack = []
        result = []
        for line in text.splitlines(keepends=True):
            stripped = line.strip()
            if stripped.startswith("```python"):
                if stack and stack[-1] == "```python":
                    result.append("```\n")
                    stack.pop()
                stack.append("```python")
                result.append(line)
            elif stripped == "```":
                if stack and stack[-1] == "```python": stack.pop()
                result.append(line)
            else:
                result.append(line)
        while stack:
            result.append("```\n")
            stack.pop()
        return "".join(result)

    return fix_text(content) if isinstance(content, str) else content


def bot_stream(messages, workspace, session_id="default"):
    original_cwd = os.getcwd()
    WORKSPACE_DIR = get_session_workspace(session_id)
    GENERATED_DIR = os.path.join(WORKSPACE_DIR, "generated")
    os.makedirs(GENERATED_DIR, exist_ok=True)

    if messages and messages[0]["role"] == "assistant": messages = messages[1:]
    if messages and messages[-1]["role"] == "user":
        user_message = messages[-1]["content"]
        file_info = collect_file_info(workspace) if workspace else collect_file_info(WORKSPACE_DIR)
        messages[-1][
            "content"] = f"# Instruction\n{user_message}\n\n# Data\n{file_info}" if file_info else f"# Instruction\n{user_message}"

    initial_workspace = set(workspace)
    assistant_reply = ""
    finished = False

    while not finished:
        response = client.chat.completions.create(
            model=MODEL_PATH, messages=messages, temperature=0.4, stream=True,
            extra_body={"add_generation_prompt": False, "stop_token_ids": [151676, 151645], "max_new_tokens": 32768}
        )
        cur_res = ""
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content is not None:
                delta = chunk.choices[0].delta.content
                cur_res += delta
                assistant_reply += delta
                yield delta
            if "</Answer>" in cur_res:
                finished = True
                break

        if chunk.choices[0].finish_reason == "stop" and not finished:
            if not cur_res.endswith("</Code>"):
                yield "</Code>"
                cur_res += "</Code>"

        if "</Code>" in cur_res and not finished:
            messages.append({"role": "assistant", "content": cur_res})
            code_match = re.search(r"<Code>(.*?)</Code>", cur_res, re.DOTALL)
            if code_match:
                code_str = re.search(r"```(?:python)?(.*?)```", code_match.group(1).strip(), re.DOTALL)
                code_str = code_str.group(1).strip() if code_str else code_match.group(1).strip()
                code_str = Chinese_matplot_str + "\n" + code_str

                before_state = {p.resolve(): p.stat().st_size for p in Path(WORKSPACE_DIR).rglob("*") if p.is_file()}
                exe_output = execute_code_safe(code_str, WORKSPACE_DIR)
                after_state = {p.resolve(): p.stat().st_size for p in Path(WORKSPACE_DIR).rglob("*") if p.is_file()}

                added_paths = [p for p in after_state.keys() if p not in before_state]
                modified_paths = [p for p in after_state.keys() if
                                  p in before_state and after_state[p] != before_state[p]]

                artifact_paths = []
                for p in added_paths:
                    if not str(p).startswith(GENERATED_DIR):
                        dest_path = uniquify_path(Path(GENERATED_DIR) / p.name)
                        shutil.copy2(str(p), str(dest_path))
                        artifact_paths.append(dest_path.resolve())
                    else:
                        artifact_paths.append(p)
                for p in modified_paths:
                    dest_path = uniquify_path(Path(GENERATED_DIR) / f"{Path(p).stem}_modified{Path(p).suffix}")
                    shutil.copy2(p, dest_path)
                    artifact_paths.append(dest_path.resolve())

                exe_str = f"\n<Execute>\n```\n{exe_output}\n```\n</Execute>\n"
                file_block = ""
                if artifact_paths:
                    lines = ["<File>"]
                    for p in artifact_paths:
                        rel = Path(p).relative_to(Path(WORKSPACE_DIR).resolve()).as_posix()
                        url = build_download_url(f"{session_id}/{rel}")
                        lines.append(f"-[{Path(p).name}]({url})")
                        if Path(p).suffix.lower() in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]:
                            lines.append(f"![{Path(p).name}]({url})")
                    file_block = "\n" + "\n".join(lines + ["</File>"]) + "\n"

                yield exe_str + file_block
                messages.append({"role": "execute", "content": f"{exe_output}"})
                initial_workspace.update([os.path.join(WORKSPACE_DIR, f) for f in os.listdir(WORKSPACE_DIR) if
                                          os.path.isfile(os.path.join(WORKSPACE_DIR, f))])
    os.chdir(original_cwd)


def _extract_sections_from_messages(messages: list[dict]) -> str:
    parts, appendix = [], []
    for idx, m in enumerate([m for m in messages if m.get("role") == "assistant"], start=1):
        content, step = str(m.get("content") or ""), 1
        for match in re.finditer(r"<(Analyze|Understand|Code|Execute|File|Answer)>([\s\S]*?)</\1>", content, re.DOTALL):
            tag, seg = match.groups()
            if tag == "Answer": parts.append(f"{seg.strip()}\n")
            appendix.append(f"\n### Step {step}: {tag}\n\n{seg.strip()}\n")
            step += 1
    final_text = "".join(parts).strip()
    if appendix: final_text += "\n\n\\newpage\n\n# Appendix: Detailed Process\n" + "".join(appendix).strip()
    return final_text


def _save_md(md_text: str, base_name: str, workspace_dir: str) -> Path:
    Path(workspace_dir).mkdir(parents=True, exist_ok=True)
    md_path = uniquify_path(Path(workspace_dir) / f"{base_name}.md")
    with open(md_path, "w", encoding="utf-8") as f: f.write(md_text)
    return md_path


def _save_pdf(md_text: str, base_name: str, workspace_dir: str):
    Path(workspace_dir).mkdir(parents=True, exist_ok=True)
    pdf_path = uniquify_path(Path(workspace_dir) / f"{base_name}.pdf")
    try:
        pypandoc.convert_text(md_text, "pdf", format="md", outputfile=str(pdf_path),
                              extra_args=["--standalone", "--pdf-engine=xelatex"])
        return pdf_path
    except Exception:
        return None