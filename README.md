# DeepAnalyze - 智能数据分析平台

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Python](https://img.shields.io/badge/Python-3.9%2B-brightgreen.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**企业级 AI 数据分析与代码生成平台**

[功能特性](#功能特性) • [快速开始](#快速开始) • [部署指南](#部署指南) • [API文档](#api文档)

</div>

---

## 📖 项目简介

DeepAnalyze 是一个企业级的智能数据分析平台，集成了 AI 对话、文件管理、代码编辑执行、报告导出等功能。支持多种数据格式的上传与分析，通过自然语言交互实现数据洞察。

### 核心能力

- 🤖 **AI 智能对话** - 基于大语言模型的数据分析与问答
- 📁 **文件管理** - 支持多种数据格式上传、预览、管理
- 💻 **代码执行** - 在线 Python 代码编辑与实时执行
- 📊 **数据可视化** - 自动生成图表与分析报告
- 📄 **报告导出** - 一键导出 PDF 分析报告
- 🔐 **用户认证** - JWT 认证与会话管理
- 📱 **响应式设计** - 支持桌面端与移动端

---

## ✨ 功能特性

### 1. 三栏式交互界面

```
┌─────────────────────────────────────────────────────────────┐
│                         顶部导航栏                           │
├────────────┬──────────────────────────┬────────────────────┤
│            │                          │                    │
│  文件管理   │      AI 对话区域          │    数据预览        │
│            │                          │                    │
│  历史会话   │      代码编辑器           │    文件预览        │
│            │                          │                    │
└────────────┴──────────────────────────┴────────────────────┘
```

### 2. 文件管理

- 拖拽上传文件
- 文件夹管理
- 文件预览（支持图片、PDF、文本等）
- 生成的代码文件自动归类

### 3. AI 对话

- 流式响应，实时显示
- 代码高亮与一键执行
- 结构化分析结果展示
- 支持多轮对话上下文

### 4. 代码执行

- 在线 Python 执行环境
- 实时输出显示
- 数据可视化支持
- 安全沙箱隔离

---

## 🚀 快速开始

### 环境要求

| 依赖 | 版本要求 |
|------|----------|
| Python | 3.9+ |
| Node.js | 18+ |
| MySQL | 8.0+ |
| bun/npm | 最新版 |

### 方式一：Docker 部署（推荐）

```bash
# 克隆项目
git clone https://github.com/your-org/deepanalyze-chat.git
cd deepanalyze-chat

# 复制并配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 配置数据库等信息

# 启动服务
docker-compose up -d

# 访问应用
# 前端: http://localhost:3000
# 后端: http://localhost:8200
# 默认账号: admin / admin123
```

### 方式二：手动部署

#### 1. 数据库配置

```sql
CREATE DATABASE deepanalyze DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 2. 后端配置

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动后端
python main.py
```

#### 3. 前端配置

```bash
cd frontend

# 安装依赖
bun install

# 开发模式
bun run dev

# 生产构建
bun run build
bun run start
```

### 方式三：使用启动脚本

```bash
# 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env

# 启动所有服务
chmod +x scripts/*.sh
./scripts/start.sh

# 停止服务
./scripts/stop.sh
```

---

## 🏗️ 部署指南

### 生产环境配置清单

#### 后端环境变量 (backend/.env)

```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=deepanalyze
DB_PASSWORD=your_secure_password
DB_NAME=deepanalyze

# JWT（生产环境必须修改！）
JWT_SECRET_KEY=your_very_secure_random_string_at_least_32_chars

# AI 服务
API_BASE=http://your-llm-server:8000/v1
USE_MOCK_LLM=false

# 会话超时（分钟）
SESSION_TIMEOUT_MINUTES=30
```

#### 前端环境变量 (frontend/.env.production)

```env
NEXT_PUBLIC_BACKEND_URL=https://api.your-domain.com
NEXT_PUBLIC_FILE_SERVER_URL=https://files.your-domain.com
NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=30
```

### Docker 生产部署

```bash
# 使用生产配置启动
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 查看日志
docker-compose logs -f app

# 更新部署
docker-compose build --no-cache app
docker-compose up -d app
```

### Nginx 反向代理配置

```nginx
# /etc/nginx/sites-available/deepanalyze.conf
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 前端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:8200/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }

    # 文件服务
    location /files/ {
        proxy_pass http://127.0.0.1:8100/;
    }
}
```

### Systemd 服务配置

```bash
# 安装服务
sudo cp deepanalyze-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable deepanalyze-backend
sudo systemctl start deepanalyze-backend
```

---

## 📁 项目结构

```
deepanalyze-chat/
├── backend/                      # 后端服务
│   ├── config/                   # 配置模块
│   │   ├── settings.py          # 配置管理
│   │   └── database.py          # 数据库连接
│   ├── models/                   # 数据模型
│   ├── services/                 # 业务逻辑层
│   │   ├── chat_service.py      # AI 对话服务
│   │   ├── code_service.py      # 代码执行服务
│   │   ├── workspace_service.py # 文件管理服务
│   │   └── user_service.py      # 用户认证服务
│   ├── controllers/              # 控制器层
│   ├── routes/                   # 路由层
│   ├── utils/                    # 工具函数
│   ├── main.py                   # 应用入口
│   ├── requirements.txt          # Python 依赖
│   └── .env.example              # 环境变量示例
│
├── frontend/                     # 前端应用
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── api/             # API Routes
│   │   │   ├── layout.tsx       # 根布局
│   │   │   └── page.tsx         # 首页
│   │   ├── components/           # React 组件
│   │   │   ├── ui/              # shadcn/ui 组件
│   │   │   ├── auth/            # 认证组件
│   │   │   └── three-panel/     # 三栏界面组件
│   │   ├── lib/                  # 工具库
│   │   │   ├── store.ts         # Zustand 状态管理
│   │   │   ├── config.ts        # API 配置
│   │   │   └── utils.ts         # 工具函数
│   │   └── hooks/                # 自定义 Hooks
│   ├── public/                   # 静态资源
│   ├── package.json
│   └── .env.example              # 环境变量示例
│
├── scripts/                      # 部署脚本
│   ├── start.sh                  # 启动脚本
│   └── stop.sh                   # 停止脚本
│
├── docker/                       # Docker 相关
│   └── start.sh                  # 容器启动脚本
│
├── docker-compose.yml            # Docker Compose 配置
├── docker-compose.prod.yml       # 生产环境配置
├── Dockerfile                    # Docker 镜像构建
├── .dockerignore                 # Docker 忽略文件
├── deepanalyze-backend.service   # Systemd 服务
├── deploy.sh                     # 一键部署脚本
└── README.md                     # 项目文档
```

---

## 🔌 API 文档

### 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend | 3000 | Next.js 前端服务 |
| Backend API | 8200 | FastAPI 后端服务 |
| File Server | 8100 | 静态文件服务 |

### 核心接口

#### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 用户登录 |
| POST | `/auth/logout` | 用户登出 |
| GET | `/auth/me` | 获取当前用户 |
| POST | `/auth/change-password` | 修改密码 |

#### 会话接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/sessions` | 获取会话列表 |
| POST | `/sessions` | 创建会话 |
| GET | `/sessions/{id}` | 获取会话详情 |
| DELETE | `/sessions/{id}` | 删除会话 |
| GET | `/sessions/{id}/messages` | 获取消息列表 |

#### 工作区接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/workspace/tree` | 获取文件树 |
| POST | `/workspace/upload-to` | 上传文件 |
| DELETE | `/workspace/file` | 删除文件 |
| DELETE | `/workspace/clear` | 清空工作区 |

#### AI 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat/completions` | AI 对话（流式） |
| POST | `/execute` | 执行 Python 代码 |
| POST | `/export/report` | 导出 PDF 报告 |

完整 API 文档请访问: `http://localhost:8200/docs`

---

## ⚙️ 配置说明

### 会话超时配置

系统支持通过环境变量配置会话超时时间：

```env
# 后端 (分钟)
SESSION_TIMEOUT_MINUTES=10

# 前端 (分钟)
NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=10
```

### AI 模型配置

```env
# 真实 LLM 服务
API_BASE=http://your-llm-server:8000/v1
MODEL_PATH=DeepAnalyze-8B
USE_MOCK_LLM=false

# 使用 Mock 服务（开发环境）
USE_MOCK_LLM=true
```

---

## 🔒 安全建议

1. **修改默认密码** - 部署后立即修改 admin 密码
2. **JWT 密钥** - 使用 32 位以上随机字符串
3. **数据库安全** - 使用强密码，限制访问 IP
4. **HTTPS** - 生产环境必须启用 HTTPS
5. **防火墙** - 仅开放必要端口
6. **定期备份** - 定期备份数据库和 workspace 目录

---

## 📄 License

[MIT License](LICENSE)

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

<div align="center">

**Made with ❤️ by DeepAnalyze Team**

</div>
