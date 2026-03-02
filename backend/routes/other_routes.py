"""
其他路由定义
"""
from fastapi import APIRouter, Query, Body
from fastapi.responses import StreamingResponse

from controllers.code_controller import CodeController
from controllers.chat_controller import ChatController, ReportController
from controllers.proxy_controller import ProxyController


def create_code_router(controller: CodeController) -> APIRouter:
    """创建代码执行路由"""
    router = APIRouter(tags=["Code"])

    @router.post("/execute")
    async def execute_code(request: dict = Body(...)):
        """执行Python代码"""
        return await controller.execute_code(request)

    return router


def create_chat_router(controller: ChatController) -> APIRouter:
    """创建聊天路由"""
    router = APIRouter(tags=["Chat"])

    @router.post("/chat/completions")
    async def chat_completions(body: dict = Body(...)):
        """聊天补全（流式）"""
        return await controller.chat_completions(body)

    return router


def create_report_router(controller: ReportController) -> APIRouter:
    """创建报告路由"""
    router = APIRouter(tags=["Report"])

    @router.post("/export/report")
    async def export_report(body: dict = Body(...)):
        """导出报告"""
        return await controller.export_report(body)

    return router


def create_proxy_router(controller: ProxyController) -> APIRouter:
    """创建代理路由"""
    router = APIRouter(tags=["Proxy"])

    @router.get("/proxy")
    async def proxy(url: str = Query(...)):
        """简单CORS代理"""
        return await controller.proxy(url)

    return router
