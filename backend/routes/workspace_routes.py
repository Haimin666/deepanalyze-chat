"""
工作区路由定义
"""
from fastapi import APIRouter, Query, File, UploadFile
from typing import List

from controllers.workspace_controller import WorkspaceController


def create_workspace_router(controller: WorkspaceController) -> APIRouter:
    """创建工作区路由"""
    router = APIRouter(prefix="/workspace", tags=["Workspace"])

    @router.get("/files")
    async def get_files(session_id: str = Query("default")):
        """获取文件列表"""
        return await controller.get_files(session_id)

    @router.get("/tree")
    async def get_tree(session_id: str = Query("default")):
        """获取文件树"""
        return await controller.get_tree(session_id)

    @router.delete("/file")
    async def delete_file(
        path: str = Query(..., description="relative path under workspace"),
        session_id: str = Query("default"),
    ):
        """删除文件"""
        return await controller.delete_file(path, session_id)

    @router.delete("/dir")
    async def delete_dir(
        path: str = Query(..., description="relative directory under workspace"),
        recursive: bool = Query(True, description="delete directory recursively"),
        session_id: str = Query("default"),
    ):
        """删除目录"""
        return await controller.delete_dir(path, recursive, session_id)

    @router.post("/move")
    async def move_path(
        src: str = Query(..., description="relative source path"),
        dst_dir: str = Query("", description="relative target directory"),
        session_id: str = Query("default"),
    ):
        """移动文件/目录"""
        return await controller.move_path(src, dst_dir, session_id)

    @router.post("/upload")
    async def upload_files(
        files: List[UploadFile] = File(...),
        session_id: str = Query("default"),
    ):
        """上传文件到根目录"""
        return await controller.upload_files(files, session_id)

    @router.post("/upload-to")
    async def upload_to_dir(
        dir: str = Query("", description="relative directory under workspace"),
        files: List[UploadFile] = File(...),
        session_id: str = Query("default"),
    ):
        """上传文件到指定目录"""
        return await controller.upload_to_dir(dir, files, session_id)

    @router.delete("/clear")
    async def clear_workspace(session_id: str = Query("default")):
        """清空工作区"""
        return await controller.clear_workspace(session_id)

    return router
