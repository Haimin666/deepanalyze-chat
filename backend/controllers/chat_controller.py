"""
聊天控制器
"""
import json
from fastapi import Body
from fastapi.responses import StreamingResponse

from services.chat_service import ChatService, ReportService
from services.workspace_service import WorkspaceService
from services.code_service import CodeService


class ChatController:
    """聊天控制器"""

    def __init__(self, workspace_service: WorkspaceService, code_service: CodeService):
        self.chat_service = ChatService(workspace_service, code_service)

    async def chat_completions(self, body: dict = Body(...), user_id: str = "default"):
        """聊天补全（流式）"""
        messages = body.get("messages", [])
        workspace = body.get("workspace", [])
        session_id = body.get("session_id", "default")

        def generate():
            for delta_content in self.chat_service.bot_stream(
                messages, workspace, session_id, user_id
            ):
                chunk = {
                    "id": "chatcmpl-stream",
                    "object": "chat.completion.chunk",
                    "created": 1677652288,
                    "model": "DeepAnalyze-8B",
                    "choices": [
                        {
                            "index": 0,
                            "delta": {"content": delta_content},
                            "finish_reason": None,
                        }
                    ],
                }
                yield json.dumps(chunk) + "\n"

            # 结束标记
            end_chunk = {
                "id": "chatcmpl-stream",
                "object": "chat.completion.chunk",
                "created": 1677652288,
                "model": "DeepAnalyze-8B",
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            }
            yield json.dumps(end_chunk) + "\n"

        return StreamingResponse(generate(), media_type="text/plain")


class ReportController:
    """报告控制器"""

    def __init__(self, workspace_service: WorkspaceService):
        self.report_service = ReportService(workspace_service)

    async def export_report(self, body: dict = Body(...), user_id: str = "default"):
        """导出报告"""
        from fastapi import HTTPException
        from fastapi.responses import JSONResponse

        try:
            messages = body.get("messages", [])
            title = (body.get("title") or "").strip()
            session_id = body.get("session_id", "default")

            if not isinstance(messages, list):
                raise HTTPException(status_code=400, detail="messages must be a list")

            result = self.report_service.export_report(messages, title, session_id, user_id)
            return JSONResponse(result)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
