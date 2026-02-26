import os
import sys
import shutil
import tempfile
import json
import subprocess
import threading
import http.server
import socketserver
from pathlib import Path
from urllib.parse import quote
from functools import partial
from core.config import WORKSPACE_BASE_DIR, HTTP_SERVER_PORT, HTTP_SERVER_BASE

def get_session_workspace(session_id: str) -> str:
    if not session_id:
        session_id = "default"
    session_dir = os.path.join(WORKSPACE_BASE_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    return session_dir

def build_download_url(rel_path: str) -> str:
    try:
        encoded = quote(rel_path, safe="/")
    except Exception:
        encoded = rel_path
    return f"{HTTP_SERVER_BASE}/{encoded}"

def start_http_server():
    os.makedirs(WORKSPACE_BASE_DIR, exist_ok=True)
    handler = partial(http.server.SimpleHTTPRequestHandler, directory=WORKSPACE_BASE_DIR)
    with socketserver.TCPServer(("", HTTP_SERVER_PORT), handler) as httpd:
        print(f"HTTP Server serving {WORKSPACE_BASE_DIR} at port {HTTP_SERVER_PORT}")
        httpd.serve_forever()

def execute_code_safe(code_str: str, workspace_dir: str = None, timeout_sec: int = 120) -> str:
    if workspace_dir is None:
        workspace_dir = WORKSPACE_BASE_DIR
    exec_cwd = os.path.abspath(workspace_dir)
    os.makedirs(exec_cwd, exist_ok=True)
    tmp_path = None
    try:
        fd, tmp_path = tempfile.mkstemp(suffix=".py", dir=exec_cwd)
        os.close(fd)
        with open(tmp_path, "w", encoding="utf-8") as f:
            f.write(code_str)
        child_env = os.environ.copy()
        child_env.setdefault("MPLBACKEND", "Agg")
        child_env.setdefault("QT_QPA_PLATFORM", "offscreen")
        child_env.pop("DISPLAY", None)

        completed = subprocess.run(
            [sys.executable, tmp_path],
            cwd=exec_cwd, capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=timeout_sec, env=child_env,
        )
        return (completed.stdout or "") + (completed.stderr or "")
    except subprocess.TimeoutExpired:
        return f"[Timeout]: execution exceeded {timeout_sec} seconds"
    except Exception as e:
        return f"[Error]: {str(e)}"
    finally:
        try:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass

def collect_file_info(directory: str) -> str:
    all_file_info_str = ""
    dir_path = Path(directory)
    if not dir_path.exists(): return ""
    files = sorted([f for f in dir_path.iterdir() if f.is_file()])
    for idx, file_path in enumerate(files, start=1):
        size_kb = os.path.getsize(file_path) / 1024
        file_info_str = json.dumps({"name": file_path.name, "size": f"{size_kb:.1f}KB"}, indent=4, ensure_ascii=False)
        all_file_info_str += f"File {idx}:\n{file_info_str}\n\n"
    return all_file_info_str

def get_file_icon(extension):
    ext = extension.lower()
    icons = {
        (".jpg", ".jpeg", ".png", ".gif", ".bmp"): "🖼️",
        (".pdf",): "📕",
        (".doc", ".docx"): "📘",
        (".txt",): "📄",
        (".md",): "📝",
        (".csv", ".xlsx"): "📊",
        (".json", ".sqlite"): "🗄️",
        (".mp4", ".avi", ".mov"): "🎥",
        (".mp3", ".wav"): "🎵",
        (".zip", ".rar", ".tar"): "🗜️",
    }
    for extensions, icon in icons.items():
        if ext in extensions: return icon
    return "📁"

def uniquify_path(target: Path) -> Path:
    if not target.exists(): return target
    parent, stem, suffix = target.parent, target.stem, target.suffix
    import re as _re
    m = _re.match(r"^(.*) \((\d+)\)$", stem)
    base, start = (m.group(1), int(m.group(2)) + 1) if m else (stem, 1)
    i = start
    while True:
        candidate = parent / f"{base} ({i}){suffix}"
        if not candidate.exists(): return candidate
        i += 1

def _rel_path(path: Path, root: Path) -> str:
    try: return path.relative_to(root).as_posix()
    except Exception: return path.name

def build_tree(path: Path, root=None) -> dict:
    if root is None: root = path
    node = {"name": path.name or "workspace", "path": _rel_path(path, root), "is_dir": path.is_dir()}
    if path.is_dir():
        def sort_key(p): return (p.name == "generated", not p.is_dir(), p.name.lower())
        node["children"] =[build_tree(child, root) for child in sorted(path.iterdir(), key=sort_key) if not child.name.startswith(".")]
    else:
        node.update({"size": path.stat().st_size, "extension": path.suffix.lower(), "icon": get_file_icon(path.suffix), "download_url": build_download_url(_rel_path(path, root))})
    return node