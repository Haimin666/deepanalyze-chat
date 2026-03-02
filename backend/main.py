"""
Three Panel Interface - Backend API
MVC 架构重构版本

启动方式:
    python main.py

或使用 uvicorn:
    uvicorn main:app --host 0.0.0.0 --port 8200
"""
import os

# 设置 matplotlib 后端
os.environ.setdefault("MPLBACKEND", "Agg")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# 导入配置
from config.settings import API_HOST, API_PORT

# 导入服务
from services.workspace_service import WorkspaceService
from services.code_service import CodeService

# 导入控制器
from controllers.workspace_controller import WorkspaceController
from controllers.code_controller import CodeController
from controllers.chat_controller import ChatController, ReportController
from controllers.proxy_controller import ProxyController

# 导入路由
from routes.workspace_routes import create_workspace_router
from routes.other_routes import (
    create_code_router,
    create_chat_router,
    create_report_router,
    create_proxy_router,
)

# 导入工具
from utils.http_server import start_http_server_thread


# ========== 初始化服务层 ==========
workspace_service = WorkspaceService()
code_service = CodeService(workspace_service)

# ========== 初始化控制器层 ==========
workspace_controller = WorkspaceController(workspace_service)
code_controller = CodeController(workspace_service)
chat_controller = ChatController(workspace_service, code_service)
report_controller = ReportController(workspace_service)
proxy_controller = ProxyController()

# ========== 创建 FastAPI 应用 ==========
app = FastAPI(
    title="Three Panel Interface API",
    description="AI助手后端API服务",
    version="2.0.0",
)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== 注册路由 ==========
app.include_router(create_workspace_router(workspace_controller))
app.include_router(create_code_router(code_controller))
app.include_router(create_chat_router(chat_controller))
app.include_router(create_report_router(report_controller))
app.include_router(create_proxy_router(proxy_controller))

# ========== 启动 HTTP 文件服务器 ==========
start_http_server_thread()


# ========== 健康检查端点 ==========
@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "version": "2.0.0"}


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "Three Panel Interface API",
        "version": "2.0.0",
        "docs": "/docs",
    }


# ========== 主入口 ==========
if __name__ == "__main__":
    print("🚀 启动后端服务...")
    print(f"   - API服务: http://localhost:{API_PORT}")
    print(f"   - 文件服务: http://localhost:8100")
    print(f"   - API文档: http://localhost:{API_PORT}/docs")

    uvicorn.run(app, host=API_HOST, port=API_PORT)
