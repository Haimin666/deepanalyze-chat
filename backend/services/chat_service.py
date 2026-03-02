"""
聊天服务层 - 处理AI聊天逻辑和报告导出
"""
import os
import re
import io
import base64
import shutil
import tempfile
import urllib.request
import urllib.error
from pathlib import Path
from typing import Generator, List, Optional, Dict, Any
from datetime import datetime

import openai

from config.settings import API_BASE, MODEL_PATH, CHINESE_MATPLOT_STR, HTTP_SERVER_BASE
from services.code_service import CodeService
from utils.file_utils import uniquify_path, collect_file_info


class ChatService:
    """聊天服务"""

    def __init__(self, workspace_service, code_service: CodeService):
        self.workspace_service = workspace_service
        self.code_service = code_service
        self.client = openai.OpenAI(base_url=API_BASE, api_key="dummy")

    def bot_stream(
        self,
        messages: List[dict],
        workspace: List[str],
        session_id: str = "default",
        user_id: str = "default"
    ) -> Generator[str, None, None]:
        """流式生成AI回复"""
        original_cwd = os.getcwd()
        WORKSPACE_DIR = self.workspace_service.get_session_workspace(session_id, user_id)
        os.makedirs(WORKSPACE_DIR, exist_ok=True)

        GENERATED_DIR = os.path.join(WORKSPACE_DIR, "generated")
        os.makedirs(GENERATED_DIR, exist_ok=True)

        # 处理消息
        if messages and messages[0]["role"] == "assistant":
            messages = messages[1:]

        if messages and messages[-1]["role"] == "user":
            user_message = messages[-1]["content"]
            file_info = (
                collect_file_info(workspace)
                if workspace
                else collect_file_info(WORKSPACE_DIR)
            )
            if file_info:
                messages[-1]["content"] = f"# Instruction\n{user_message}\n\n# Data\n{file_info}"
            else:
                messages[-1]["content"] = f"# Instruction\n{user_message}"

        initial_workspace = set(workspace) if workspace else set()
        assistant_reply = ""
        finished = False

        while not finished:
            response = self.client.chat.completions.create(
                model=MODEL_PATH,
                messages=messages,
                temperature=0.4,
                stream=True,
                extra_body={
                    "add_generation_prompt": False,
                    "stop_token_ids": [151676, 151645],
                    "max_new_tokens": 32768,
                },
            )

            cur_res = ""
            chunk = None
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content is not None:
                    delta = chunk.choices[0].delta.content
                    cur_res += delta
                    assistant_reply += delta
                    yield delta

                if "</Answer>" in cur_res:
                    finished = True
                    break

            if chunk and chunk.choices[0].finish_reason == "stop" and not finished:
                if not cur_res.endswith("</Code>"):
                    missing_tag = "</Code>"
                    cur_res += missing_tag
                    assistant_reply += missing_tag
                    yield missing_tag

            if "</Code>" in cur_res and not finished:
                messages.append({"role": "assistant", "content": cur_res})
                code_match = re.search(r"<Code>(.*?)</Code>", cur_res, re.DOTALL)

                if code_match:
                    code_content = code_match.group(1).strip()
                    md_match = re.search(r"```(?:python)?(.*?)```", code_content, re.DOTALL)
                    code_str = md_match.group(1).strip() if md_match else code_content
                    code_str = self.code_service.add_chinese_matplot_support(code_str)

                    # 执行代码
                    exe_output = self.code_service.execute_code_safe(code_str, WORKSPACE_DIR)

                    # 处理生成的文件
                    artifact_paths = self._handle_generated_files(
                        WORKSPACE_DIR, GENERATED_DIR
                    )

                    # 构建执行结果
                    exe_str = f"\n<Execute>\n```\n{exe_output}\n```\n</Execute>\n"
                    file_block = self._build_file_block(artifact_paths, WORKSPACE_DIR, user_id, session_id)
                    full_execution_block = exe_str + file_block

                    assistant_reply += full_execution_block
                    yield full_execution_block

                    messages.append({"role": "execute", "content": f"{exe_output}"})

                    # 更新工作区快照
                    current_files = set(
                        os.path.join(WORKSPACE_DIR, f)
                        for f in os.listdir(WORKSPACE_DIR)
                        if os.path.isfile(os.path.join(WORKSPACE_DIR, f))
                    )
                    new_files = list(current_files - initial_workspace)
                    if new_files:
                        workspace.extend(new_files)
                        initial_workspace.update(new_files)

        os.chdir(original_cwd)

    def _handle_generated_files(
        self,
        workspace_dir: str,
        generated_dir: str
    ) -> List[Path]:
        """处理代码生成的文件"""
        # 执行前快照
        try:
            before_state = {
                p.resolve(): (p.stat().st_size, p.stat().st_mtime_ns)
                for p in Path(workspace_dir).rglob("*")
                if p.is_file()
            }
        except Exception:
            before_state = {}

        # 执行后快照
        try:
            after_state = {
                p.resolve(): (p.stat().st_size, p.stat().st_mtime_ns)
                for p in Path(workspace_dir).rglob("*")
                if p.is_file()
            }
        except Exception:
            after_state = {}

        # 计算新增与修改
        added_paths = [p for p in after_state.keys() if p not in before_state]
        modified_paths = [
            p for p in after_state.keys()
            if p in before_state and after_state[p] != before_state[p]
        ]

        artifact_paths = []

        # 处理新增文件
        for p in added_paths:
            try:
                if not str(p).startswith(generated_dir):
                    dest_path = uniquify_path(Path(generated_dir) / p.name)
                    shutil.copy2(str(p), str(dest_path))
                    artifact_paths.append(dest_path.resolve())
                else:
                    artifact_paths.append(p)
            except Exception as e:
                print(f"Error moving file {p}: {e}")
                artifact_paths.append(p)

        # 处理修改的文件
        for p in modified_paths:
            try:
                dest_name = f"{Path(p).stem}_modified{Path(p).suffix}"
                dest_path = uniquify_path(Path(generated_dir) / dest_name)
                shutil.copy2(p, dest_path)
                artifact_paths.append(dest_path.resolve())
            except Exception as e:
                print(f"Error copying modified file {p}: {e}")

        return artifact_paths

    def _build_file_block(
        self,
        artifact_paths: List[Path],
        workspace_dir: str,
        user_id: str,
        session_id: str
    ) -> str:
        """构建文件信息块"""
        if not artifact_paths:
            return ""

        lines = ["<File>"]
        for p in artifact_paths:
            try:
                rel = Path(p).relative_to(Path(workspace_dir).resolve()).as_posix()
            except Exception:
                rel = Path(p).name

            url = self.workspace_service.build_download_url(f"{user_id}/{session_id}/{rel}")
            name = Path(p).name
            lines.append(f"- [{name}]({url})")

            if Path(p).suffix.lower() in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]:
                lines.append(f"![{name}]({url})")

        lines.append("</File>")
        return "\n" + "\n".join(lines) + "\n"


class ReportService:
    """报告导出服务 - 生成 PDF 报告 (md->html->pdf)"""

    # 缓存字体路径
    _cached_font_path: Optional[str] = None
    _font_download_attempted: bool = False

    def __init__(self, workspace_service):
        self.workspace_service = workspace_service

    def extract_sections_from_messages(self, messages: List[dict]) -> tuple:
        """从消息中提取报告内容和图片信息"""
        if not isinstance(messages, list):
            return "", []

        parts = []
        appendix = []
        all_images = []
        tag_pattern = r"<(Analyze|Understand|Code|Execute|File|Answer)>([\s\S]*?)</\1>"
        file_pattern = r"!\[([^\]]*)\]\(([^)]+)\)"

        for idx, m in enumerate(messages, start=1):
            role = (m or {}).get("role")
            if role != "assistant":
                continue
            content = str((m or {}).get("content") or "")

            step = 1
            for match in re.finditer(tag_pattern, content, re.DOTALL):
                tag, seg = match.groups()
                seg = seg.strip()

                # 提取图片URL
                for img_match in re.finditer(file_pattern, seg):
                    img_alt, img_url = img_match.groups()
                    all_images.append({
                        "alt": img_alt,
                        "url": img_url,
                        "section": tag,
                        "step": step
                    })

                if tag == "Answer":
                    parts.append(f"{seg}\n")
                appendix.append(f"\n### Step {step}: {tag}\n\n{seg}\n")
                step += 1

        final_text = "".join(parts).strip()
        if appendix:
            final_text += (
                "\n\n---\n\n# 附录：详细过程\n"
                + "".join(appendix).strip()
            )

        return final_text, all_images

    def save_md(self, md_text: str, base_name: str, workspace_dir: str) -> Path:
        """保存Markdown文件"""
        Path(workspace_dir).mkdir(parents=True, exist_ok=True)
        md_path = uniquify_path(Path(workspace_dir) / f"{base_name}.md")
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_text)
        return md_path

    def download_image(self, url: str, save_dir: str) -> Optional[str]:
        """下载图片到本地"""
        import requests
        try:
            # 如果是相对URL，补全为完整URL
            if url.startswith("/") or url.startswith("generated/"):
                url = f"{HTTP_SERVER_BASE}/{url.lstrip('/')}"
            elif not url.startswith("http"):
                url = f"{HTTP_SERVER_BASE}/{url}"

            response = requests.get(url, timeout=15)
            if response.status_code == 200:
                # 从URL提取文件名
                filename = url.split("/")[-1].split("?")[0]
                if not filename or filename == "":
                    filename = f"image_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"

                # 清理文件名中的特殊字符
                filename = re.sub(r'[^\w\-_.]', '_', filename)
                save_path = os.path.join(save_dir, filename)
                with open(save_path, "wb") as f:
                    f.write(response.content)
                return save_path
        except Exception as e:
            print(f"Failed to download image {url}: {e}")
        return None

    def _download_chinese_font(self, font_dir: str) -> Optional[str]:
        """下载中文字体"""
        # 只尝试一次下载
        if ReportService._font_download_attempted:
            return None
        
        ReportService._font_download_attempted = True
        
        # 使用 Noto Sans SC 字体
        font_urls = [
            "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf",
            "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf",
        ]
        
        font_path = os.path.join(font_dir, "NotoSansSC-Regular.otf")

        if os.path.exists(font_path):
            return font_path

        try:
            print(f"Downloading Chinese font to {font_path}...")
            os.makedirs(font_dir, exist_ok=True)
            
            for font_url in font_urls:
                try:
                    # 设置超时和重试
                    req = urllib.request.Request(font_url, headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    })
                    with urllib.request.urlopen(req, timeout=30) as response:
                        with open(font_path, 'wb') as f:
                            f.write(response.read())
                        print(f"Font downloaded successfully from {font_url}")
                        return font_path
                except urllib.error.URLError as e:
                    print(f"Failed to download from {font_url}: {e}")
                    continue
                    
        except Exception as e:
            print(f"Failed to download font: {e}")
            
        return None

    def _find_chinese_font(self) -> Optional[str]:
        """查找可用的中文字体"""
        # 使用缓存
        if ReportService._cached_font_path:
            if os.path.exists(ReportService._cached_font_path):
                return ReportService._cached_font_path

        # 常见字体路径
        font_paths = [
            # Linux - Noto CJK (最常见)
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/noto/NotoSansSC-Regular.otf",
            # Linux - WenQuanYi
            "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
            "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
            "/usr/share/fonts/wqy-microhei/wqy-microhei.ttc",
            # Linux - Source Han
            "/usr/share/fonts/adobe-source-han-sans/SourceHanSansSC-Regular.otf",
            "/usr/share/fonts/opentype/source-han-sans/SourceHanSansSC-Regular.otf",
            # Linux - Droid
            "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
            # macOS
            "/System/Library/Fonts/PingFang.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
            "/Library/Fonts/Arial Unicode.ttf",
            # Windows
            "C:\\Windows\\Fonts\\msyh.ttc",
            "C:\\Windows\\Fonts\\msyhbd.ttc",
            "C:\\Windows\\Fonts\\simhei.ttf",
            "C:\\Windows\\Fonts\\simsun.ttc",
            "C:\\Windows\\Fonts\\simkai.ttf",
            "C:\\Windows\\Fonts\\STZHONGS.TTF",
        ]

        for fp in font_paths:
            if os.path.exists(fp):
                print(f"Found font: {fp}")
                ReportService._cached_font_path = fp
                return fp

        # 尝试使用 fc-list 查找字体
        try:
            import subprocess
            result = subprocess.run(
                ["fc-list", ":lang=zh", "-f", "%{file}\n"],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                fonts = result.stdout.strip().split("\n")
                if fonts and fonts[0]:
                    font_path = fonts[0]
                    print(f"Found font via fc-list: {font_path}")
                    ReportService._cached_font_path = font_path
                    return font_path
        except Exception as e:
            print(f"fc-list failed: {e}")

        # 尝试下载字体
        font_cache_dir = os.path.expanduser("~/.cache/deepanalyze/fonts")
        downloaded_font = self._download_chinese_font(font_cache_dir)
        if downloaded_font:
            ReportService._cached_font_path = downloaded_font
            return downloaded_font

        print("WARNING: No Chinese font found, PDF may have encoding issues")
        return None

    def _save_pdf_via_html(
        self, 
        md_text: str, 
        base_name: str, 
        workspace_dir: str,
        export_dir: str
    ) -> tuple:
        """
        使用 md->html->pdf 方式生成 PDF
        返回 (pdf_path, error_message) 元组
        """
        # 检查 markdown 库
        try:
            import markdown
        except ImportError:
            return None, "PDF 生成失败: 缺少 markdown 库，请运行 pip install markdown"

        Path(export_dir).mkdir(parents=True, exist_ok=True)
        pdf_path = uniquify_path(Path(export_dir) / f"{base_name}.pdf")
        
        # --- 1. 扫描所有可用图片 ---
        image_extensions = {'.png', '.jpg', '.jpeg', '.svg', '.bmp', '.gif', '.webp'}
        all_images = {}  # {filename: path}
        try:
            for f in Path(export_dir).iterdir():
                if f.is_file() and f.suffix.lower() in image_extensions:
                    all_images[f.name] = f
        except Exception:
            pass

        # --- 2. 处理正文中的图片链接 ---
        pdf_md = md_text
        referenced_images = set()

        for fname, img_path in all_images.items():
            escaped_fname = re.escape(fname)
            # 查找 MD 中是否引用了此图片 (e.g. ![...](filename) or [..](filename))
            pattern = r"(?:!\[.*?\]|\[.*?\])\((?:.*?/)?(?:" + escaped_fname + r")\)"
            
            if re.search(pattern, pdf_md):
                referenced_images.add(fname)
                # 替换为 file:// 绝对路径
                abs_path = img_path.resolve().as_posix()
                # 替换引用
                replace_pattern = r"\((?:.*?/)?(?:" + escaped_fname + r")\)"
                pdf_md = re.sub(replace_pattern, f"(file://{abs_path})", pdf_md)

        # --- 3. 追加"孤儿"图片 (Orphan Images) ---
        # 模型生成了但没写进报告的图片
        orphan_images = [img for name, img in all_images.items() if name not in referenced_images]
        
        if orphan_images:
            pdf_md += "\n\n\\newpage\n\n# 补充图表 (Supplementary Figures)\n\n"
            pdf_md += "以下是分析过程中生成但未在正文中引用的图表：\n\n"
            for img_path in sorted(orphan_images):
                abs_path = img_path.resolve().as_posix()
                pdf_md += f"### {img_path.name}\n"
                pdf_md += f"![{img_path.name}](file://{abs_path})\n\n"

        # --- 4. 转换为 HTML ---
        html_body = markdown.markdown(
            pdf_md, 
            extensions=['fenced_code', 'tables', 'nl2br', 'sane_lists']
        )

        # --- 5. 生成 PDF ---
        errors = []
        
        # Strategy 1: ReportLab (纯 Python，无系统依赖)
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage
            from reportlab.lib.units import cm
            from reportlab.lib.enums import TA_LEFT
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            
            # 尝试注册中文字体
            font_registered = False
            font_paths = [
                "/System/Library/Fonts/PingFang.ttc",
                "/System/Library/Fonts/STHeiti Light.ttc",
                "/Library/Fonts/Arial Unicode.ttf",
                "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
                "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
                "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
                "C:\\Windows\\Fonts\\msyh.ttc",
                "C:\\Windows\\Fonts\\simhei.ttf",
            ]
            
            for fp in font_paths:
                if os.path.exists(fp):
                    try:
                        pdfmetrics.registerFont(TTFont('ChineseFont', fp))
                        font_registered = True
                        break
                    except Exception:
                        continue
            
            doc = SimpleDocTemplate(str(pdf_path), pagesize=A4, 
                                    leftMargin=2*cm, rightMargin=2*cm,
                                    topMargin=2*cm, bottomMargin=2*cm)
            
            styles = getSampleStyleSheet()
            if font_registered:
                styles.add(ParagraphStyle(name='Chinese', fontName='ChineseFont', fontSize=11, leading=16))
                normal_style = styles['Chinese']
            else:
                normal_style = styles['Normal']
            
            story = []
            
            # 简单处理 HTML 文本
            import re
            # 移除 HTML 标签，保留文本
            plain_text = re.sub(r'<[^>]+>', '', html_body)
            plain_text = plain_text.replace('&nbsp;', ' ')
            plain_text = plain_text.replace('&amp;', '&')
            plain_text = plain_text.replace('&lt;', '<')
            plain_text = plain_text.replace('&gt;', '>')
            
            for line in plain_text.split('\n'):
                if line.strip():
                    try:
                        story.append(Paragraph(line, normal_style))
                    except Exception:
                        story.append(Paragraph(line.encode('utf-8', errors='ignore').decode('utf-8'), normal_style))
                    story.append(Spacer(1, 0.3*cm))
            
            # 添加图片
            for fname, img_path in all_images.items():
                try:
                    img = RLImage(str(img_path), width=15*cm, height=10*cm)
                    img.hAlign = 'CENTER'
                    story.append(img)
                    story.append(Spacer(1, 0.5*cm))
                except Exception as e:
                    print(f"Failed to add image {fname}: {e}")
            
            doc.build(story)
            print(f"PDF generated successfully via ReportLab: {pdf_path}")
            return pdf_path, None
            
        except ImportError:
            errors.append("缺少 reportlab 库")
        except Exception as e:
            errors.append(f"ReportLab 失败: {str(e)}")
            print(f"[PDF Warning] ReportLab failed: {e}")

        # Strategy 2: WeasyPrint
        try:
            from weasyprint import HTML, CSS
            css = CSS(string="""
                @page { margin: 2cm; }
                body { font-family: "SimHei", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; font-size: 11pt; line-height: 1.6; }
                img { max-width: 95%; height: auto; display: block; margin: 20px auto; border: 1px solid #ddd; box-shadow: 2px 2px 8px rgba(0,0,0,0.1); }
                pre { background: #f8f9fa; padding: 10px; border: 1px solid #eee; white-space: pre-wrap; font-family: monospace; }
                h1, h2, h3 { color: #333; margin-top: 1.2em; }
                table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; }
                th { background-color: #f2f2f2; }
            """)
            HTML(string=html_body, base_url=str(workspace_dir)).write_pdf(str(pdf_path), stylesheets=[css])
            print(f"PDF generated successfully via WeasyPrint: {pdf_path}")
            return pdf_path, None
        
        except ImportError:
            errors.append("缺少 weasyprint 库 (需要安装 pango: brew install pango gdk-pixbuf libffi)")
        except Exception as e:
            errors.append(f"WeasyPrint 失败: {str(e)}")
            print(f"[PDF Warning] WeasyPrint failed: {e}")

        # Strategy 3: xhtml2pdf Fallback
        try:
            from xhtml2pdf import pisa
            with open(pdf_path, "wb") as pdf_file:
                pisa_status = pisa.CreatePDF(html_body, dest=pdf_file, encoding='utf-8')
            if not pisa_status.err:
                print(f"PDF generated successfully via xhtml2pdf: {pdf_path}")
                return pdf_path, None
            else:
                errors.append("xhtml2pdf 生成错误")
        except ImportError:
            errors.append("缺少 xhtml2pdf 库")
        except Exception as e:
            errors.append(f"xhtml2pdf 失败: {str(e)}")
            print(f"[PDF Error] xhtml2pdf failed: {e}")

        error_msg = "PDF 生成失败: " + "; ".join(errors) + "\n\n提示: macOS 请运行 'brew install pango gdk-pixbuf libffi' 安装依赖"
        return None, error_msg

    def generate_pdf(
        self,
        md_text: str,
        images: List[dict],
        base_name: str,
        export_dir: str,
        session_id: str,
        user_id: str = "default"
    ) -> tuple:
        """生成 PDF 报告，使用 md->html->pdf 方式
        返回 (pdf_path, error_message) 元组
        """
        workspace_dir = self.workspace_service.get_session_workspace(session_id, user_id)
        return self._save_pdf_via_html(md_text, base_name, workspace_dir, export_dir)

    def export_report(
        self,
        messages: List[dict],
        title: str,
        session_id: str,
        user_id: str = "default"
    ) -> dict:
        """导出报告为 PDF"""
        workspace_dir = self.workspace_service.get_session_workspace(session_id, user_id)

        md_text, images = self.extract_sections_from_messages(messages)
        if not md_text:
            md_text = "（未找到分析内容）\n\n请在对话中进行分析后再导出报告。"

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_title = re.sub(r"[^\w\-_.]+", "_", title) if title else "Report"
        base_name = f"{safe_title}_{ts}" if title else f"Report_{ts}"

        export_dir = os.path.join(workspace_dir, "generated")
        os.makedirs(export_dir, exist_ok=True)

        # 保存 Markdown
        md_path = self.save_md(md_text, base_name, export_dir)

        # 生成 PDF (使用 md->html->pdf 方式)
        pdf_path, pdf_error = self.generate_pdf(
            md_text, images, base_name, export_dir, session_id, user_id
        )

        # 构建返回结果
        result = {
            "message": "exported",
            "md": md_path.name,
            "pdf": pdf_path.name if pdf_path else None,
            "images_count": len(images),
            "download_urls": {
                "md": self.workspace_service.build_download_url(
                    f"{user_id}/{session_id}/generated/{md_path.name}"
                ),
            }
        }

        if pdf_path:
            result["download_urls"]["pdf"] = self.workspace_service.build_download_url(
                f"{user_id}/{session_id}/generated/{pdf_path.name}"
            )
        else:
            # 返回具体的错误信息
            result["error"] = pdf_error or "PDF 生成失败"

        print(f"Export result: {result}")
        return result
