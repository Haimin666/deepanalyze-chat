# DeepAnalyze - 智能数据分析平台

企业级数据分析与代码生成平台，支持文件管理、AI聊天分析、代码编辑执行、用户认证与会话管理。

## 技术栈

### 前端
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand (状态管理)
- Monaco Editor (代码编辑)

### 后端
- FastAPI
- SQLAlchemy ORM
- MySQL 数据库
- JWT 认证
- PyJWT + bcrypt

---

## 快速开始

### 1. 环境要求

- Python 3.9+
- Node.js 18+
- MySQL 8.0+
- bun 或 npm

### 2. 数据库配置

```sql
-- 创建数据库
CREATE DATABASE deepanalyze DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 后端配置

```bash
cd backend

# 复制配置文件
cp .env.example .env

# 编辑 .env，配置数据库连接
# DB_HOST=your_mysql_host
# DB_USER=your_mysql_user
# DB_PASSWORD=your_mysql_password
# DB_NAME=deepanalyze

# 安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
```

### 4. 前端配置

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

### 5. 访问应用

- 前端: http://localhost:3000
- 后端 API: http://localhost:8200
- API 文档: http://localhost:8200/docs

**默认管理员账户**: admin / admin123

---

## 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端应用 | 3000 | Next.js 服务 |
| 后端 API | 8200 | FastAPI 服务 |
| 文件服务 | 8100 | 静态文件服务 |
| Mock LLM | 8000 | 模拟 AI 服务（开发用） |

---

## API 端点

### 认证 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/auth/login` | POST | 用户登录 |
| `/auth/logout` | POST | 用户登出 |
| `/auth/me` | GET | 获取当前用户 |
| `/auth/change-password` | POST | 修改密码 |

### 会话 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/sessions` | GET | 获取会话列表 |
| `/sessions` | POST | 创建会话 |
| `/sessions/{id}` | GET | 获取会话详情 |
| `/sessions/{id}` | DELETE | 删除会话 |
| `/sessions/{id}/messages` | GET | 获取消息列表 |
| `/sessions/{id}/messages` | POST | 保存消息 |

### 工作区 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/workspace/files` | GET | 获取文件列表 |
| `/workspace/tree` | GET | 获取文件树 |
| `/workspace/upload-to` | POST | 上传文件 |
| `/workspace/delete/file` | DELETE | 删除文件 |
| `/workspace/delete/dir` | DELETE | 删除目录 |
| `/workspace/clear` | DELETE | 清空工作区 |

### 聊天与执行 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/chat/completions` | POST | AI 聊天（流式） |
| `/execute` | POST | 执行 Python 代码 |
| `/export/report` | POST | 导出 PDF 报告 |

---

## 生产部署

### 1. 环境变量配置

**后端 (backend/.env)**
```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=deepanalyze

# JWT
JWT_SECRET_KEY=your_very_secure_jwt_key
JWT_EXPIRE_HOURS=24

# 服务
API_HOST=0.0.0.0
API_PORT=8200

# AI 模型
API_BASE=http://your_llm_server:8000/v1
MODEL_PATH=DeepAnalyze-8B
```

**前端 (frontend/.env.production)**
```env
NEXT_PUBLIC_BACKEND_URL=https://your-domain.com:8200
NEXT_PUBLIC_FILE_SERVER_URL=https://your-domain.com:8100
```

### 2. Systemd 服务

```bash
# 复制服务文件
sudo cp deepanalyze-backend.service /etc/systemd/system/

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable deepanalyze-backend
sudo systemctl start deepanalyze-backend
```

### 3. Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://localhost:8200/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

---

## 目录结构

```
deepanalyze-chat/
├── backend/                    # 后端服务
│   ├── config/                 # 配置
│   ├── models/                 # 数据模型
│   ├── services/               # 业务逻辑
│   ├── controllers/            # 控制器
│   ├── routes/                 # 路由
│   ├── utils/                  # 工具
│   ├── main.py                 # 入口
│   ├── init_db.sql             # 数据库初始化
│   ├── requirements.txt        # Python 依赖
│   └── .env.example            # 环境变量示例
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── app/                # Next.js App Router
│   │   ├── components/         # React 组件
│   │   ├── lib/                # 工具库
│   │   └── hooks/              # Hooks
│   ├── public/                 # 静态资源
│   ├── package.json
│   └── .env.production
│
├── deploy.sh                   # 部署脚本
├── deepanalyze-backend.service # Systemd 服务
└── README.md
```

---

## 安全建议

1. **修改默认密码**: 首次部署后立即修改 admin 密码
2. **JWT 密钥**: 使用强随机字符串作为 JWT_SECRET_KEY
3. **数据库**: 使用强密码，限制访问 IP
4. **HTTPS**: 生产环境必须使用 HTTPS
5. **防火墙**: 只开放必要端口

---

## License

MIT
