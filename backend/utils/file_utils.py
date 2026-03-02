"""
文件工具函数
"""
import os
import json
from pathlib import Path


def uniquify_path(target: Path) -> Path:
    """若目标已存在，生成 'name (1).ext'、'name (2).ext' 形式的新路径"""
    if not target.exists():
        return target

    parent = target.parent
    stem = target.stem
    suffix = target.suffix

    import re as _re
    m = _re.match(r"^(.*) \((\d+)\)$", stem)
    base = stem
    start = 1

    if m:
        base = m.group(1)
        try:
            start = int(m.group(2)) + 1
        except Exception:
            start = 1

    i = start
    while True:
        candidate = parent / f"{base} ({i}){suffix}"
        if not candidate.exists():
            return candidate
        i += 1


def collect_file_info(directory: str) -> str:
    """收集文件信息"""
    all_file_info_str = ""
    dir_path = Path(directory)

    if not dir_path.exists():
        return ""

    files = sorted([f for f in dir_path.iterdir() if f.is_file()])

    for idx, file_path in enumerate(files, start=1):
        size_bytes = os.path.getsize(file_path)
        size_kb = size_bytes / 1024
        size_str = f"{size_kb:.1f}KB"
        file_info = {"name": file_path.name, "size": size_str}
        file_info_str = json.dumps(file_info, indent=4, ensure_ascii=False)
        all_file_info_str += f"File {idx}:\n{file_info_str}\n\n"

    return all_file_info_str
