"""
工作区服务层 - 处理文件系统操作
"""
import os
import shutil
from pathlib import Path
from urllib.parse import quote
from typing import List, Optional

from config.settings import WORKSPACE_BASE_DIR, HTTP_SERVER_BASE
from models.workspace import WorkspaceFile, WorkspaceNode


class WorkspaceService:
    """工作区服务"""

    def __init__(self):
        self.base_dir = WORKSPACE_BASE_DIR
        self._ensure_base_dir()

    def _ensure_base_dir(self):
        """确保基础目录存在"""
        os.makedirs(self.base_dir, exist_ok=True)

    def get_session_workspace(self, session_id: str) -> str:
        """获取指定会话的工作区路径"""
        if not session_id:
            session_id = "default"
        session_dir = os.path.join(self.base_dir, session_id)
        os.makedirs(session_dir, exist_ok=True)
        return session_dir

    def build_download_url(self, rel_path: str) -> str:
        """构建下载URL"""
        try:
            encoded = quote(rel_path, safe="/")
        except Exception:
            encoded = rel_path
        return f"{HTTP_SERVER_BASE}/{encoded}"

    def get_file_icon(self, extension: str) -> str:
        """获取文件图标"""
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
            if ext in extensions:
                return icon
        return "📁"

    def get_files(self, session_id: str) -> List[WorkspaceFile]:
        """获取工作区文件列表"""
        workspace_dir = self.get_session_workspace(session_id)
        generated_dir = Path(workspace_dir) / "generated"

        # 获取 generated 目录下的文件名集合
        generated_files = (
            set(f.name for f in generated_dir.iterdir() if f.is_file())
            if generated_dir.exists()
            else set()
        )

        files = []
        for file_path in Path(workspace_dir).iterdir():
            if file_path.is_file():
                if file_path.name in generated_files:
                    continue
                stat = file_path.stat()
                rel_path = f"{session_id}/{file_path.name}"
                preview_extensions = [
                    ".jpg", ".jpeg", ".png", ".gif", ".bmp",
                    ".pdf", ".txt", ".doc", ".docx", ".csv", ".xlsx"
                ]

                files.append(WorkspaceFile(
                    name=file_path.name,
                    size=stat.st_size,
                    extension=file_path.suffix.lower(),
                    icon=self.get_file_icon(file_path.suffix),
                    download_url=self.build_download_url(rel_path),
                    preview_url=(
                        self.build_download_url(rel_path)
                        if file_path.suffix.lower() in preview_extensions
                        else None
                    )
                ))

        return files

    def build_tree(self, path: Path, root: Optional[Path] = None) -> dict:
        """构建文件树"""
        if root is None:
            root = path

        node = {
            "name": path.name or "workspace",
            "path": self._rel_path(path, root),
            "is_dir": path.is_dir(),
        }

        if path.is_dir():
            children = []

            def sort_key(p):
                is_generated = p.name == "generated"
                is_dir = p.is_dir()
                return (is_generated, not is_dir, p.name.lower())

            for child in sorted(path.iterdir(), key=sort_key):
                if child.name.startswith("."):
                    continue
                children.append(self.build_tree(child, root))
            node["children"] = children
        else:
            node["size"] = path.stat().st_size
            node["extension"] = path.suffix.lower()
            node["icon"] = self.get_file_icon(path.suffix)
            rel = self._rel_path(path, root)
            node["download_url"] = self.build_download_url(rel)

        return node

    def _rel_path(self, path: Path, root: Path) -> str:
        """获取相对路径"""
        try:
            rel = path.relative_to(root)
            return rel.as_posix()
        except Exception:
            return path.name

    def get_tree(self, session_id: str) -> dict:
        """获取文件树"""
        workspace_dir = self.get_session_workspace(session_id)
        root = Path(workspace_dir)
        tree_data = self.build_tree(root, root)

        # 在下载链接前加上 session_id 前缀
        self._prefix_urls(tree_data, session_id)
        return tree_data

    def _prefix_urls(self, node: dict, session_id: str):
        """为URL添加session_id前缀"""
        if "download_url" in node and node["download_url"]:
            rel = node.get("path", "")
            node["download_url"] = self.build_download_url(f"{session_id}/{rel}")
        if "children" in node:
            for child in node["children"]:
                self._prefix_urls(child, session_id)

    def delete_file(self, path: str, session_id: str) -> bool:
        """删除文件"""
        workspace_dir = self.get_session_workspace(session_id)
        abs_workspace = Path(workspace_dir).resolve()
        target = (abs_workspace / path).resolve()

        if abs_workspace not in target.parents and target != abs_workspace:
            raise ValueError("Invalid path")
        if not target.exists():
            raise FileNotFoundError("Not found")
        if target.is_dir():
            raise ValueError("Folder deletion not allowed")

        target.unlink()
        return True

    def delete_dir(self, path: str, session_id: str, recursive: bool = True) -> bool:
        """删除目录"""
        workspace_dir = self.get_session_workspace(session_id)
        abs_workspace = Path(workspace_dir).resolve()
        target = (abs_workspace / path).resolve()

        if abs_workspace not in target.parents and target != abs_workspace:
            raise ValueError("Invalid path")
        if target == abs_workspace:
            raise ValueError("Cannot delete workspace root")
        if not target.exists():
            raise FileNotFoundError("Not found")
        if not target.is_dir():
            raise ValueError("Not a directory")

        if recursive:
            shutil.rmtree(target)
        else:
            target.rmdir()
        return True

    def move_path(self, src: str, dst_dir: str, session_id: str) -> str:
        """移动文件/目录"""
        from utils.file_utils import uniquify_path

        workspace_dir = self.get_session_workspace(session_id)
        abs_workspace = Path(workspace_dir).resolve()

        abs_src = (abs_workspace / src).resolve()
        if abs_workspace not in abs_src.parents and abs_src != abs_workspace:
            raise ValueError("Invalid src path")
        if not abs_src.exists():
            raise FileNotFoundError("Source not found")

        abs_dst_dir = (abs_workspace / (dst_dir or "")).resolve()
        if abs_workspace not in abs_dst_dir.parents and abs_dst_dir != abs_workspace:
            raise ValueError("Invalid dst_dir path")
        abs_dst_dir.mkdir(parents=True, exist_ok=True)

        target = uniquify_path(abs_dst_dir / abs_src.name)
        shutil.move(str(abs_src), str(target))
        return str(target.relative_to(abs_workspace))

    def upload_files(self, files: List, session_id: str, dir_path: str = "") -> List[dict]:
        """上传文件"""
        from utils.file_utils import uniquify_path

        workspace_dir = self.get_session_workspace(session_id)
        abs_workspace = Path(workspace_dir).resolve()

        if dir_path:
            target_dir = (abs_workspace / dir_path).resolve()
            if abs_workspace not in target_dir.parents and target_dir != abs_workspace:
                raise ValueError("Invalid dir path")
        else:
            target_dir = abs_workspace

        target_dir.mkdir(parents=True, exist_ok=True)

        saved = []
        for f in files:
            dst = uniquify_path(target_dir / f.filename)
            content = f.file.read() if hasattr(f, 'file') else f.read()
            with open(dst, "wb") as buffer:
                buffer.write(content)
            saved.append({
                "name": dst.name,
                "size": len(content),
                "path": str(dst.relative_to(abs_workspace)),
            })
        return saved

    def clear_workspace(self, session_id: str) -> bool:
        """清空工作区"""
        workspace_dir = self.get_session_workspace(session_id)
        if os.path.exists(workspace_dir):
            shutil.rmtree(workspace_dir)
        os.makedirs(workspace_dir, exist_ok=True)
        return True
