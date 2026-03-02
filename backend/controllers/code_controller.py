"""
代码执行控制器
"""
from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool

from models.workspace import CodeExecuteRequest, CodeExecuteResponse
from services.code_service import CodeService
from services.workspace_service import WorkspaceService


class CodeController:
    """代码执行控制器"""

    def __init__(self, workspace_service: WorkspaceService):
        self.code_service = CodeService(workspace_service)

    async def execute_code(self, request: dict):
        """执行Python代码"""
        try:
            code = request.get("code", "")
            session_id = request.get("session_id", "default")

            if not code:
                raise HTTPException(status_code=400, detail="No code provided")

            # 获取工作区目录
            workspace_dir = self.code_service.workspace_service.get_session_workspace(session_id)

            # 在线程池中执行代码
            result = await run_in_threadpool(
                self.code_service.execute_code_safe,
                code,
                workspace_dir
            )

            return CodeExecuteResponse(
                success=True,
                result=result,
                message="Code executed successfully",
            )

        except HTTPException:
            raise
        except Exception as e:
            return CodeExecuteResponse(
                success=False,
                result=f"Error: {str(e)}",
                message="Code execution failed",
            )
