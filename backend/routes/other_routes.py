"""
其他路由定义
"""
from fastapi import APIRouter, Query, Body, Depends
from fastapi.responses import StreamingResponse

from controllers.code_controller import CodeController
from controllers.chat_controller import ChatController, ReportController
from controllers.proxy_controller import ProxyController
from controllers.auth_controller import AuthController
from models.workspace import User


def create_code_router(controller: CodeController) -> APIRouter:
    """创建代码执行路由"""
    router = APIRouter(tags=["Code"])
    auth_controller = AuthController()

    @router.post("/execute")
    async def execute_code(
        request: dict = Body(...),
        user: User = Depends(auth_controller.get_current_user)
    ):
        """执行Python代码"""
        return await controller.execute_code(request, user.id)

    return router


def create_chat_router(controller: ChatController) -> APIRouter:
    """创建聊天路由"""
    router = APIRouter(tags=["Chat"])
    auth_controller = AuthController()

    @router.post("/chat/completions")
    async def chat_completions(
        body: dict = Body(...),
        user: User = Depends(auth_controller.get_current_user)
    ):
        """聊天补全（流式）"""
        return await controller.chat_completions(body, user.id)

    @router.post("/chat/stop")
    async def stop_stream(
        body: dict = Body(...),
        user: User = Depends(auth_controller.get_current_user)
    ):
        """停止流式响应"""
        return await controller.stop_stream(body)

    @router.post("/chat/stream-session")
    async def create_stream_session(
        user: User = Depends(auth_controller.get_current_user)
    ):
        """创建新的流式会话ID"""
        return await controller.create_stream_session()

    return router


def create_report_router(controller: ReportController) -> APIRouter:
    """创建报告路由"""
    router = APIRouter(tags=["Report"])
    auth_controller = AuthController()

    @router.post("/export/report")
    async def export_report(
        body: dict = Body(...),
        user: User = Depends(auth_controller.get_current_user)
    ):
        """导出报告"""
        return await controller.export_report(body, user.id)

    return router


def create_proxy_router(controller: ProxyController) -> APIRouter:
    """创建代理路由"""
    router = APIRouter(tags=["Proxy"])

    @router.get("/proxy")
    async def proxy(url: str = Query(...)):
        """简单CORS代理"""
        return await controller.proxy(url)

    return router
