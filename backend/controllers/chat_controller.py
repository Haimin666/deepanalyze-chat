"""
聊天控制器
"""
import json
from fastapi import Body
from fastapi.responses import StreamingResponse, JSONResponse

from services.chat_service import ChatService, ReportService
from services.workspace_service import WorkspaceService
from services.code_service import CodeService
from services.mock_llm_service import stop_manager, MockLLMService


class ChatController:
    """聊天控制器"""

    def __init__(self, workspace_service: WorkspaceService, code_service: CodeService, use_mock: bool = False):
        self.chat_service = ChatService(workspace_service, code_service)
        self.workspace_service = workspace_service
        self.code_service = code_service
        self.use_mock = use_mock
        self.mock_service = MockLLMService() if use_mock else None

    async def chat_completions(self, body: dict = Body(...), user_id: str = "default"):
        """聊天补全（流式）"""
        messages = body.get("messages", [])
        workspace = body.get("workspace", [])
        session_id = body.get("session_id", "default")
        stream_session_id = body.get("stream_session_id")  # 前端传入的流式会话ID

        # 如果使用 mock 服务
        if self.use_mock and self.mock_service:
            def generate_mock():
                for delta_content in self.mock_service.stream_response(
                    messages, stream_session_id
                ):
                    chunk = {
                        "id": "chatcmpl-stream",
                        "object": "chat.completion.chunk",
                        "created": 1677652288,
                        "model": "DeepAnalyze-8B-Mock",
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
                    "model": "DeepAnalyze-8B-Mock",
                    "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
                }
                yield json.dumps(end_chunk) + "\n"

            return StreamingResponse(generate_mock(), media_type="text/plain")

        # 真实 LLM 服务
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

    async def stop_stream(self, body: dict = Body(...)):
        """停止流式响应"""
        session_id = body.get("stream_session_id")
        if not session_id:
            return JSONResponse(
                {"success": False, "error": "Missing stream_session_id"},
                status_code=400
            )
        
        success = stop_manager.stop_session(session_id)
        return JSONResponse({
            "success": success,
            "message": f"Session {session_id} stopped" if success else "Session not found"
        })

    async def create_stream_session(self):
        """创建新的流式会话ID"""
        session_id = stop_manager.create_session()
        return JSONResponse({
            "stream_session_id": session_id
        })


class ReportController:
    """报告控制器"""

    def __init__(self, workspace_service: WorkspaceService):
        self.report_service = ReportService(workspace_service)

    async def export_report(self, body: dict = Body(...), user_id: str = "default"):
        """导出报告"""
        from fastapi import HTTPException

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
