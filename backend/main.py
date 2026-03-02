"""
Three Panel Interface - Backend API
企业级部署版本

启动方式:
    python main.py

或使用 uvicorn:
    uvicorn main:app --host 0.0.0.0 --port 8200
"""
import os
import sys
from pathlib import Path

# 设置 matplotlib 后端
os.environ.setdefault("MPLBACKEND", "Agg")

# 加载 .env 环境变量文件
from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ 已加载环境配置: {env_path}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# 导入配置
from config.settings import API_HOST, API_PORT, USE_MOCK_LLM
from config.database import DB_HOST, DB_NAME

# 导入服务
from services.workspace_service import WorkspaceService
from services.code_service import CodeService
from services.database_service import db_service

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
from routes.auth_routes import create_auth_router, create_user_router, create_session_router

# 导入工具
from utils.http_server import start_http_server_thread


def create_app() -> FastAPI:
    """创建 FastAPI 应用"""
    
    # ========== 初始化数据库 ==========
    print("🔧 初始化数据库连接...")
    try:
        db_service.create_tables()
        db_service.init_default_admin()
        print(f"✅ 数据库连接成功: {DB_HOST}/{DB_NAME}")
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        print("   请检查数据库配置是否正确")

    # ========== 初始化服务层 ==========
    workspace_service = WorkspaceService()
    code_service = CodeService(workspace_service)

    # ========== 初始化控制器层 ==========
    workspace_controller = WorkspaceController(workspace_service)
    code_controller = CodeController(workspace_service)
    chat_controller = ChatController(workspace_service, code_service, use_mock=USE_MOCK_LLM)
    report_controller = ReportController(workspace_service)
    proxy_controller = ProxyController()
    
    # 打印 Mock 状态
    if USE_MOCK_LLM:
        print("🎭 Mock LLM 服务已启用 - 使用模拟响应")

    # ========== 创建 FastAPI 应用 ==========
    app = FastAPI(
        title="DeepAnalyze API",
        description="智能数据分析与代码生成平台 - 企业级后端API服务",
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
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
    # 工作区路由
    app.include_router(create_workspace_router(workspace_controller))

    # 代码执行路由
    app.include_router(create_code_router(code_controller))

    # 聊天路由
    app.include_router(create_chat_router(chat_controller))

    # 报告导出路由
    app.include_router(create_report_router(report_controller))

    # 代理路由
    app.include_router(create_proxy_router(proxy_controller))

    # 认证路由
    app.include_router(create_auth_router())

    # 用户管理路由
    app.include_router(create_user_router())

    # 会话管理路由
    app.include_router(create_session_router())

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
            "message": "DeepAnalyze API",
            "version": "2.0.0",
            "docs": "/docs",
            "redoc": "/redoc",
        }

    return app


# 创建应用实例
app = create_app()


# ========== 主入口 ==========
if __name__ == "__main__":
    print("=" * 50)
    print("🚀 DeepAnalyze 后端服务启动中...")
    print("=" * 50)
    print(f"   - API服务: http://localhost:{API_PORT}")
    print(f"   - 文件服务: http://localhost:8100")
    print(f"   - API文档: http://localhost:{API_PORT}/docs")
    print(f"   - 数据库: {DB_HOST}/{DB_NAME}")
    print("=" * 50)

    uvicorn.run(app, host=API_HOST, port=API_PORT)
