"""
工作区控制器
"""
from fastapi import Query, File, UploadFile, HTTPException
from typing import List

from services.workspace_service import WorkspaceService


class WorkspaceController:
    """工作区控制器"""

    def __init__(self, workspace_service: WorkspaceService):
        self.workspace_service = workspace_service

    async def get_files(self, session_id: str = Query("default")):
        """获取文件列表"""
        files = self.workspace_service.get_files(session_id)
        return {"files": [f.__dict__ for f in files]}

    async def get_tree(self, session_id: str = Query("default")):
        """获取文件树"""
        return self.workspace_service.get_tree(session_id)

    async def delete_file(
        self,
        path: str = Query(..., description="relative path under workspace"),
        session_id: str = Query("default"),
    ):
        """删除文件"""
        try:
            self.workspace_service.delete_file(path, session_id)
            return {"message": "deleted"}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def delete_dir(
        self,
        path: str = Query(..., description="relative directory under workspace"),
        recursive: bool = Query(True, description="delete directory recursively"),
        session_id: str = Query("default"),
    ):
        """删除目录"""
        try:
            self.workspace_service.delete_dir(path, session_id, recursive)
            return {"message": "deleted"}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def move_path(
        self,
        src: str = Query(..., description="relative source path"),
        dst_dir: str = Query("", description="relative target directory"),
        session_id: str = Query("default"),
    ):
        """移动文件/目录"""
        try:
            new_path = self.workspace_service.move_path(src, dst_dir, session_id)
            return {"message": "moved", "new_path": new_path}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Source not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Move failed: {e}")

    async def upload_files(
        self,
        files: List[UploadFile] = File(...),
        session_id: str = Query("default"),
    ):
        """上传文件到根目录"""
        try:
            saved = self.workspace_service.upload_files(files, session_id, "")
            return {
                "message": f"Successfully uploaded {len(saved)} files",
                "files": saved,
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def upload_to_dir(
        self,
        dir: str = Query("", description="relative directory under workspace"),
        files: List[UploadFile] = File(...),
        session_id: str = Query("default"),
    ):
        """上传文件到指定目录"""
        try:
            saved = self.workspace_service.upload_files(files, session_id, dir)
            return {"message": f"uploaded {len(saved)}", "files": saved}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Save failed: {e}")

    async def clear_workspace(self, session_id: str = Query("default")):
        """清空工作区"""
        try:
            self.workspace_service.clear_workspace(session_id)
            return {"message": "Workspace cleared successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
