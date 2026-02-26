# DeepAnalyze Chat 重构项目

本项目是基于 `ruc-datalab/DeepAnalyze` Demo 重构的企业级 AI 数据分析与代码执行聊天系统。
项目采用 **FastAPI (后端) + Next.js (前端)** 架构，实现了多用户管理、会话持久化、消息限制以及安全沙盒代码执行。

## 🏗 模块介绍

### 后端模块 (`backend/`)
后端采用标准的分层架构设计，便于维护和扩展：

*   **`core/` (核心配置)**: 包含数据库连接配置 (`database.py`)、环境变量常量 (`config.py`) 以及 JWT 鉴权和安全策略 (`security.py`)。
*   **`models/` (数据模型)**: 定义了 SQLAlchemy 的 ORM 表结构，包括 `User` (用户), `ChatSession` (会话) 和 `Message` (消息记录)。
*   **`schemas/` (数据校验)**: 定义了 Pydantic 模型，用于验证前端请求的参数和格式化后端返回的数据。
*   **`services/` (业务逻辑)**: 核心业务封装：
    *   `workspace_service.py`: 处理工作区的文件系统操作和 Python 代码的安全沙盒隔离执行。
    *   `llm_service.py`: 封装对话历史拼接、大模型流式调用 (`bot_stream`) 及报告渲染。
    *   `chat_service.py`: 处理会话落库、消息持久化，以及每个会话最多保存 50 条消息的强制限制。
    *   `user_service.py`: 管理用户的增删改查。
*   **`api/` (路由控制器)**: 定义了 HTTP 接口：
    *   `/api/auth`: 用户登录与 Token 分发。
    *   `/api/admin`: 管理员专属的用户管理接口。
    *   `/workspace`: 文件树、上传、下载、代码沙盒执行接口。
    *   `/chat`: 历史记录查询、流式对话生成和报告导出接口。

### 前端模块 (`frontend/`)
app/layout.tsx：Next.js App Router 的根布局，定义全局布局结构、主题提供器等。
app/page.tsx：默认首页路由组件。
components/three-panel-interface.tsx：核心 UI 组件，可能是应用的主界面布局。
lib/utils.ts：通用工具函数库。
lib/monaco-config.ts：Monaco Editor（代码编辑器）的配置文件。
package.json：项目依赖与脚本配置。
next.config.mjs：Next.js 框架配置。
tsconfig.json：TypeScript 编译配置。

前端基于 React 和 Next.js 构建：
*   **登录页 (`/login`)**: 用户身份认证。
*   **管理台 (`/admin`)**: 管理员角色的控制面板，可进行用户的创建和删除。
*   **工作区与聊天 (`/chat`)**: 左侧边栏管理历史对话，主视窗进行问答和代码执行结果的可视化呈现。

---

## 🚀 本地部署与启动

### 环境准备
1. Python 3.9+
2. Node.js 18+

### 1. 启动后端
```bash
cd backend
# 安装依赖
pip install -r requirements.txt

# 启动 FastAPI 服务 (默认运行在 8200 端口，文件服务在 8100 端口)
python main.py
(首次运行会自动在本地生成 deepanalyze.db SQLite 数据库，并创建一个默认管理员账号 admin / admin123)
cd frontend
# 安装依赖
npm install

# 启动 Next.js 开发服务器
npm run dev
打开浏览器访问 http://localhost:3000/login，使用 admin / admin123 登录即可体验。



Docker
一键启动：docker-compose up -d --build
访问前端： http://localhost:3000
查看后端 API 文档： http://localhost:8200/docs
查看日志：docker-compose logs -f
停止服务：docker-compose down
