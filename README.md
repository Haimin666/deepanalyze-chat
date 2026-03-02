# Three Panel Interface - AI 助手应用

一个基于 Next.js 15 + FastAPI 的三面板 AI 助手界面，支持文件管理、AI 聊天分析、代码编辑执行、用户认证与会话管理。

## 项目结构

```
chat/
├── backend/                # FastAPI 后端服务
│   ├── config/            # 配置管理
│   ├── models/            # 数据模型
│   ├── services/          # 业务逻辑层
│   ├── controllers/       # 控制器层
│   ├── routes/            # 路由定义
│   ├── utils/             # 工具函数
│   ├── main.py            # 应用入口 (端口 8200)
│   ├── mock_server.py     # Mock LLM 服务 (端口 8000)
│   └── requirements.txt
│
├── frontend/               # Next.js 前端应用
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # React 组件
│   │   ├── lib/           # 工具库和配置
│   │   └── hooks/         # 全局 Hooks
│   └── package.json
│
└── README.md
```

---

## 快速开始

### 1. 环境要求

- Python 3.9+
- Node.js 18+
- bun 或 pnpm

### 2. 安装依赖

```bash
# 后端依赖
cd chat/backend
pip install -r requirements.txt

# 前端依赖
cd chat/frontend
bun install
```

### 3. 启动服务

```bash
# 启动 Mock LLM 服务 (终端1)
cd chat/backend
python mock_server.py
# Mock LLM 服务: http://localhost:8000

# 启动后端 (终端2)
cd chat/backend
python main.py
# API服务: http://localhost:8200
# 文件服务: http://localhost:8100

# 启动前端 (终端3)
cd chat/frontend
bun run dev
# 前端应用: http://localhost:3000
```

### 4. 访问应用

打开浏览器访问 http://localhost:3000

**测试账号：**
| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

---

## 功能特性

### 用户认证
- 用户名密码登录
- 10分钟无操作自动登出
- 用户角色区分（admin/user）

### 三面板界面
- **左侧面板**：文件树 + 历史会话（可拖动分割）
- **中间面板**：AI 聊天对话
- **右侧面板**：代码编辑器 + 预览

### 工作区管理
- 文件上传/下载/删除/移动
- 文件树展示
- 会话隔离

### AI 聊天
- 流式聊天响应（通过 Mock LLM 服务）
- 代码自动执行
- 报告导出（PDF）

### 会话历史
- 点击 + 创建新会话
- 空会话不保存到历史
- 最多保留 50 个历史会话
- 会话切换与恢复（聊天记录联动）
- 删除按钮

---

## 服务端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端应用 | 3000 | Next.js 开发服务器 |
| Mock LLM | 8000 | 模拟 AI 聊天服务 |
| 文件服务 | 8100 | HTTP 文件服务器 |
| 后端 API | 8200 | FastAPI 应用 |

---

## API 文档

### Mock LLM 服务 (端口 8000)

| 端点 | 方法 | 描述 |
|------|------|------|
| `/v1/chat/completions` | POST | AI 聊天（流式响应，OpenAI 兼容格式） |
| `/health` | GET | 健康检查 |

---

### 后端 API (端口 8200)

#### 工作区管理

| 端点 | 方法 | 描述 |
|------|------|------|
| `/workspace/files` | GET | 获取文件列表 |
| `/workspace/tree` | GET | 获取文件树 |
| `/workspace/upload` | POST | 上传文件到根目录 |
| `/workspace/upload-to` | POST | 上传文件到指定目录 |
| `/workspace/file` | DELETE | 删除文件 |
| `/workspace/dir` | DELETE | 删除目录 |
| `/workspace/move` | POST | 移动文件/目录 |
| `/workspace/clear` | DELETE | 清空工作区 |

#### 代码执行

| 端点 | 方法 | 描述 |
|------|------|------|
| `/execute` | POST | 执行 Python 代码 |

#### 报告导出

| 端点 | 方法 | 描述 |
|------|------|------|
| `/export/report` | POST | 导出 PDF 报告（含图片） |

---

### 前端 API Routes (端口 3000)

#### 认证

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/logout` | POST | 用户登出 |
| `/api/auth/me` | GET | 获取当前用户信息 |

#### 用户管理

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/users` | GET | 获取用户列表 |
| `/api/users` | POST | 创建用户 |
| `/api/users` | PUT | 更新用户 |
| `/api/users` | DELETE | 删除用户 |

---

## 会话逻辑说明

### 创建新会话
1. 点击中间面板左下角的 **+** 按钮
2. 系统生成新的会话 ID
3. 当前会话如果有消息，自动保存到历史

### 保存会话
- 只有**有消息**的会话才会保存到历史
- 空会话（只有欢迎消息）不会保存
- 创建新会话或切换会话时，自动保存当前会话

### 历史会话列表
- 最多保留 50 个历史会话
- 按更新时间倒序排列
- 显示会话标题、消息数量、最后预览
- 支持删除按钮

### 切换历史会话
- 点击历史会话项
- 自动加载该会话的聊天记录
- 文件树联动显示该会话的文件

---

## 环境变量

### 前端 (frontend/.env.local)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8200
NEXT_PUBLIC_FILE_SERVER_URL=http://localhost:8100
NEXT_PUBLIC_MOCK_LLM_URL=http://localhost:8000
```

### 后端 (backend/.env)

```env
# AI 模型配置
API_BASE=http://localhost:8000/v1
MODEL_PATH=DeepAnalyze-8B

# 工作区配置
WORKSPACE_BASE_DIR=workspace
HTTP_SERVER_PORT=8100
API_PORT=8200
```

---

## 技术栈

### 前端
- Next.js 15 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand (状态管理)
- Monaco Editor (代码编辑)
- react-arborist (文件树)

### 后端
- FastAPI
- OpenAI SDK
- uvicorn

---

## 常见问题

### Q: 文件上传失败？
检查后端服务是否运行，确认端口 8200 和 8100 未被占用。

### Q: AI 聊天无响应？
确认 Mock LLM 服务运行在 localhost:8000。

### Q: 登录后立即退出？
清除浏览器 localStorage 后重试。

### Q: 历史会话点击无反应？
检查浏览器控制台是否有错误，刷新页面后重试。

---

## 许可证

MIT License

---

# 核心代码实现逻辑详解

本章节详细说明前后端的核心代码架构和实现逻辑，方便开发者理解和扩展。

---

## 一、前端架构详解

### 1. 项目目录结构

```
frontend/src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes（服务端接口）
│   │   ├── auth/                 # 认证相关
│   │   │   ├── login/route.ts    # 登录接口
│   │   │   ├── logout/route.ts   # 登出接口
│   │   │   └── me/route.ts       # 获取当前用户信息
│   │   └── users/route.ts        # 用户管理接口
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 主页面
│   └── globals.css               # 全局样式
│
├── components/                   # React 组件
│   ├── three-panel/              # 三面板核心组件
│   │   ├── ThreePanelInterface.tsx  # 主界面组件
│   │   ├── LeftPanel.tsx         # 左侧面板（文件树+历史）
│   │   ├── MiddlePanel.tsx       # 中间面板（聊天）
│   │   ├── RightPanel.tsx        # 右侧面板（代码编辑器）
│   │   ├── HistoryPanel.tsx      # 历史会话面板
│   │   ├── WorkspaceTreeRow.tsx  # 文件树行组件
│   │   ├── ContextMenu.tsx       # 右键菜单
│   │   ├── StepNavigator.tsx     # 步骤导航
│   │   ├── MessageRenderer.tsx   # 消息渲染器
│   │   ├── ChatMessageItem.tsx   # 聊天消息项
│   │   ├── UserAvatar.tsx        # 用户头像
│   │   ├── hooks/                # 自定义 Hooks
│   │   │   ├── useChat.ts        # 聊天逻辑
│   │   │   ├── useWorkspace.ts   # 工作区管理
│   │   │   ├── useSession.ts     # 会话管理
│   │   │   ├── useCodeEditor.ts  # 代码编辑器
│   │   │   ├── usePreview.ts     # 预览功能
│   │   │   ├── useTheme.ts       # 主题切换
│   │   │   └── useSectionCollapse.ts  # 折叠控制
│   │   ├── types.ts              # 类型定义
│   │   └── utils.ts              # 工具函数
│   ├── auth/                     # 认证组件
│   │   ├── LoginPage.tsx         # 登录页面
│   │   ├── AdminPage.tsx         # 管理页面
│   │   └── UserMenu.tsx          # 用户菜单
│   └── ui/                       # shadcn/ui 组件库
│
├── lib/                          # 工具库
│   ├── store.ts                  # Zustand 状态管理
│   ├── auth-store.ts             # 认证状态
│   ├── config.ts                 # API 配置
│   └── utils.ts                  # 工具函数
│
└── hooks/                        # 全局 Hooks
    ├── use-toast.ts              # Toast 提示
    └── use-mobile.ts             # 移动端检测
```

---

### 2. 核心状态管理（Zustand）

#### store.ts - 会话状态管理

```typescript
// 位置：frontend/src/lib/store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 会话类型定义
export interface ChatSession {
  id: string;
  title: string;
  preview?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  messages?: StoredMessage[];
}

// 存储的消息格式
export interface StoredMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  localOnly?: boolean;
}

// 状态接口
interface SessionState {
  currentSessionId: string | null;
  sessions: ChatSession[];
  
  // 会话操作方法
  setCurrentSession: (id: string) => void;
  createNewSession: () => string;
  addSession: (session: ChatSession) => void;
  updateSession: (id: string, updates: Partial<ChatSession>) => void;
  deleteSession: (id: string) => void;
  saveCurrentSession: (title: string, count: number, preview?: string, messages?: StoredMessage[]) => void;
  getSessionMessages: (id: string) => StoredMessage[] | undefined;
  hasMessages: boolean;
}

// 创建 Store
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      currentSessionId: null,
      sessions: [],
      hasMessages: false,
      
      // 设置当前会话
      setCurrentSession: (id) => set({ currentSessionId: id }),
      
      // 创建新会话 - 生成唯一ID
      createNewSession: () => {
        const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set({ currentSessionId: id, hasMessages: false });
        return id;
      },
      
      // 添加会话到历史
      addSession: (session) => set((state) => {
        const MAX_SESSIONS = 50;
        const sessions = [session, ...state.sessions]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, MAX_SESSIONS);
        return { sessions };
      }),
      
      // 删除会话
      deleteSession: (id) => set((state) => ({
        sessions: state.sessions.filter(s => s.id !== id)
      })),
      
      // 保存当前会话
      saveCurrentSession: (title, count, preview, messages) => {
        const state = get();
        if (!state.currentSessionId) return;
        
        const session: ChatSession = {
          id: state.currentSessionId,
          title: title.slice(0, 50),
          preview,
          messageCount: count,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages,
        };
        
        // 检查是否已存在
        const existingIndex = state.sessions.findIndex(s => s.id === session.id);
        if (existingIndex >= 0) {
          // 更新现有会话
          const sessions = [...state.sessions];
          sessions[existingIndex] = { ...sessions[existingIndex], ...session };
          set({ sessions, hasMessages: true });
        } else {
          // 添加新会话
          set((state) => {
            const sessions = [session, ...state.sessions].slice(0, 50);
            return { sessions, hasMessages: true };
          });
        }
      },
      
      // 获取会话消息
      getSessionMessages: (id) => {
        const session = get().sessions.find(s => s.id === id);
        return session?.messages;
      },
    }),
    {
      name: 'chat-sessions', // localStorage key
    }
  )
);
```

**关键设计要点：**

1. **持久化存储**：使用 `zustand/middleware` 的 `persist` 中间件，自动将状态保存到 localStorage
2. **会话ID生成**：使用时间戳 + 随机字符串确保唯一性
3. **会话数量限制**：最多保留50个历史会话，自动裁剪旧会话
4. **消息格式转换**：存储时转换为简化的 `StoredMessage` 格式

---

#### auth-store.ts - 认证状态管理

```typescript
// 位置：frontend/src/lib/auth-store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  user: { username: string; role: string } | null;
  loginTime: number | null;
  lastActivity: number | null;
  TIMEOUT_MINUTES: number;
  
  // 方法
  login: (user: { username: string; role: string }) => void;
  logout: () => void;
  checkTimeout: () => boolean;
  updateActivity: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      loginTime: null,
      lastActivity: null,
      TIMEOUT_MINUTES: 10, // 10分钟超时
      
      // 登录
      login: (user) => set({
        isAuthenticated: true,
        user,
        loginTime: Date.now(),
        lastActivity: Date.now(),
      }),
      
      // 登出
      logout: () => set({
        isAuthenticated: false,
        user: null,
        loginTime: null,
        lastActivity: null,
      }),
      
      // 检查超时
      checkTimeout: () => {
        const state = get();
        if (!state.lastActivity) return false;
        
        const elapsed = Date.now() - state.lastActivity;
        const isTimeout = elapsed > state.TIMEOUT_MINUTES * 60 * 1000;
        
        if (isTimeout) {
          set({ isAuthenticated: false, user: null });
        }
        return isTimeout;
      },
      
      // 更新活动时间
      updateActivity: () => set({ lastActivity: Date.now() }),
    }),
    {
      name: 'auth-store',
    }
  )
);
```

---

### 3. 核心组件实现

#### ThreePanelInterface.tsx - 主界面组件

```typescript
// 位置：frontend/src/components/three-panel/ThreePanelInterface.tsx

// 核心架构：
// 1. 认证状态检测 - 登录/主界面/管理员页面切换
// 2. 会话管理 - 创建、切换、保存、删除会话
// 3. 三面板布局 - 使用 ResizablePanelGroup 实现
// 4. 消息渲染 - 支持 Markdown、代码高亮、步骤折叠

export function ThreePanelInterface() {
  // ============ 状态管理 ============
  const { isAuthenticated, checkTimeout, updateActivity } = useAuthStore();
  const { currentSessionId, sessions, setCurrentSession, deleteSession, createNewSession, saveCurrentSession } = useSessionStore();
  
  // ============ 自定义 Hooks ============
  const { isDarkMode, toggleTheme } = useTheme();
  const { workspaceTree, loadWorkspaceFiles, deleteFile, uploadToDir } = useWorkspace(sessionId);
  const { messages, handleSendMessage, loadSessionMessages } = useChat(sessionId);
  const { codeEditorContent, executeCode } = useCodeEditor(sessionId);
  
  // ============ 会话管理逻辑 ============
  
  // 创建新会话
  const handleNewSession = useCallback(() => {
    // 1. 保存当前会话到历史
    if (messages.length > 1) {
      saveCurrentSession(title, messages.length, preview, storedMessages);
    }
    // 2. 创建新会话ID
    createNewSession();
    // 3. 清空聊天
    clearChat();
  }, [messages, saveCurrentSession, createNewSession, clearChat]);
  
  // 切换历史会话
  const handleSelectSession = useCallback((id: string) => {
    // 1. 保存当前会话
    if (messages.length > 1) {
      saveCurrentSession(...);
    }
    // 2. 切换到目标会话
    setCurrentSession(id);
    // 3. 加载历史消息
    const storedMsgs = getSessionMessages(id);
    if (storedMsgs) {
      loadSessionMessages(storedMsgs);
    }
  }, [...]);
  
  // ============ 渲染 ============
  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel><LeftPanel ... /></ResizablePanel>
      <ResizablePanel><MiddlePanel ... /></ResizablePanel>
      <ResizablePanel><RightPanel ... /></ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

---

#### useChat.ts - 聊天逻辑 Hook

```typescript
// 位置：frontend/src/components/three-panel/hooks/useChat.ts

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  
  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isTyping) return;
    
    // 1. 添加用户消息
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // 2. 创建 AI 消息占位
    const aiMessageId = `ai_${Date.now()}`;
    setStreamingMessageId(aiMessageId);
    setMessages(prev => [...prev, {
      id: aiMessageId,
      content: '',
      sender: 'ai',
      timestamp: new Date(),
    }]);
    
    try {
      // 3. 调用后端 API（流式响应）
      const response = await fetch(API_URLS.CHAT_COMPLETIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          session_id: sessionId,
        }),
      });
      
      // 4. 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(jsonStr);
              const delta = data.choices?.[0]?.delta?.content || '';
              
              // 追加内容到 AI 消息
              setMessages(prev => prev.map(m => 
                m.id === aiMessageId 
                  ? { ...m, content: m.content + delta }
                  : m
              ));
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
      setStreamingMessageId(null);
    }
  }, [inputValue, isTyping, messages, sessionId]);
  
  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isTyping,
    streamingMessageId,
    handleSendMessage,
    loadSessionMessages, // 加载历史会话消息
    clearChat,
  };
}
```

---

#### useWorkspace.ts - 工作区管理 Hook

```typescript
// 位置：frontend/src/components/three-panel/hooks/useWorkspace.ts

export function useWorkspace(sessionId: string) {
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceNode | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');
  
  // 加载文件树
  const loadWorkspaceTree = useCallback(async () => {
    try {
      const res = await fetch(`${API_URLS.WORKSPACE_TREE}?session_id=${sessionId}`);
      const data = await res.json();
      setWorkspaceTree(data);
    } catch (error) {
      console.error('Failed to load workspace tree:', error);
    }
  }, [sessionId]);
  
  // 上传文件到指定目录
  const uploadToDir = useCallback(async (dirPath: string, files: FileList | File[]) => {
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));
    
    try {
      const res = await fetch(`${API_URLS.WORKSPACE_UPLOAD_TO}?path=${encodeURIComponent(dirPath)}&session_id=${sessionId}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setUploadMsg(`已上传 ${data.uploaded?.length || 0} 个文件`);
      await loadWorkspaceTree();
    } catch (error) {
      setUploadMsg('上传失败');
    }
  }, [sessionId, loadWorkspaceTree]);
  
  // 删除文件
  const deleteFile = useCallback(async (path: string) => {
    await fetch(`${API_URLS.WORKSPACE_DELETE_FILE}?path=${encodeURIComponent(path)}&session_id=${sessionId}`, {
      method: 'DELETE',
    });
    await loadWorkspaceTree();
  }, [sessionId, loadWorkspaceTree]);
  
  // 删除目录
  const deleteDir = useCallback(async (path: string) => {
    await fetch(`${API_URLS.WORKSPACE_DELETE_DIR}?path=${encodeURIComponent(path)}&session_id=${sessionId}`, {
      method: 'DELETE',
    });
    await loadWorkspaceTree();
  }, [sessionId, loadWorkspaceTree]);
  
  return {
    workspaceTree,
    loadWorkspaceTree,
    uploadToDir,
    deleteFile,
    deleteDir,
  };
}
```

---

### 4. API 配置

```typescript
// 位置：frontend/src/lib/config.ts

export const API_CONFIG = {
  BACKEND_BASE_URL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8200",
  FILE_SERVER_BASE: process.env.NEXT_PUBLIC_FILE_SERVER_URL || "http://localhost:8100",
  MOCK_LLM_URL: process.env.NEXT_PUBLIC_MOCK_LLM_URL || "http://localhost:8000",
};

export const API_URLS = {
  // 工作区
  WORKSPACE_FILES: `${API_CONFIG.BACKEND_BASE_URL}/workspace/files`,
  WORKSPACE_TREE: `${API_CONFIG.BACKEND_BASE_URL}/workspace/tree`,
  WORKSPACE_UPLOAD: `${API_CONFIG.BACKEND_BASE_URL}/workspace/upload`,
  WORKSPACE_UPLOAD_TO: `${API_CONFIG.BACKEND_BASE_URL}/workspace/upload-to`,
  WORKSPACE_DELETE_FILE: `${API_CONFIG.BACKEND_BASE_URL}/workspace/file`,
  WORKSPACE_DELETE_DIR: `${API_CONFIG.BACKEND_BASE_URL}/workspace/dir`,
  WORKSPACE_CLEAR: `${API_CONFIG.BACKEND_BASE_URL}/workspace/clear`,
  
  // 聊天 - 指向 Mock LLM 服务
  CHAT_COMPLETIONS: `${API_CONFIG.MOCK_LLM_URL}/v1/chat/completions`,
  
  // 报告导出
  EXPORT_REPORT: `${API_CONFIG.BACKEND_BASE_URL}/export/report`,
  
  // 认证 (Next.js API Routes)
  AUTH_LOGIN: "/api/auth/login",
  AUTH_LOGOUT: "/api/auth/logout",
  AUTH_ME: "/api/auth/me",
};
```

---

## 二、后端架构详解

### 1. 项目目录结构

```
backend/
├── config/                       # 配置模块
│   ├── settings.py               # 应用配置
│   └── database.py               # 数据库配置
│
├── models/                       # 数据模型
│   ├── database.py               # 数据库连接
│   └── workspace.py              # 工作区模型
│
├── services/                     # 业务逻辑层
│   ├── chat_service.py           # 聊天服务 + 报告导出
│   ├── workspace_service.py      # 工作区服务
│   ├── code_service.py           # 代码执行服务
│   ├── user_service.py           # 用户服务
│   └── mock_llm_service.py       # Mock LLM 服务
│
├── controllers/                  # 控制器层
│   ├── chat_controller.py        # 聊天控制器
│   ├── workspace_controller.py   # 工作区控制器
│   ├── code_controller.py        # 代码执行控制器
│   └── proxy_controller.py       # 代理控制器
│
├── routes/                       # 路由定义
│   ├── workspace_routes.py       # 工作区路由
│   └── other_routes.py           # 其他路由
│
├── utils/                        # 工具函数
│   ├── file_utils.py             # 文件工具
│   └── http_server.py            # HTTP 文件服务器
│
├── main.py                       # FastAPI 应用入口 (端口 8200)
├── mock_server.py                # Mock LLM 服务 (端口 8000)
└── requirements.txt              # Python 依赖
```

---

### 2. 核心服务实现

#### chat_service.py - 聊天服务与报告导出

```python
# 位置：backend/services/chat_service.py

import os
import re
from typing import Generator, List
import openai
from config.settings import API_BASE, MODEL_PATH, HTTP_SERVER_BASE
from services.code_service import CodeService

class ChatService:
    """AI 聊天服务 - 流式响应 + 代码执行"""
    
    def __init__(self, workspace_service, code_service: CodeService):
        self.workspace_service = workspace_service
        self.code_service = code_service
        self.client = openai.OpenAI(base_url=API_BASE, api_key="dummy")
    
    def bot_stream(
        self,
        messages: List[dict],
        workspace: List[str],
        session_id: str = "default"
    ) -> Generator[str, None, None]:
        """
        流式生成 AI 回复
        
        流程：
        1. 处理用户消息，添加文件上下文
        2. 调用 LLM API 流式生成
        3. 检测 <Code> 标签，执行 Python 代码
        4. 收集生成的文件，返回文件链接
        5. 循环直到 </Answer> 标签出现
        """
        WORKSPACE_DIR = self.workspace_service.get_session_workspace(session_id)
        GENERATED_DIR = os.path.join(WORKSPACE_DIR, "generated")
        os.makedirs(GENERATED_DIR, exist_ok=True)
        
        # 添加文件上下文
        if messages and messages[-1]["role"] == "user":
            user_message = messages[-1]["content"]
            file_info = collect_file_info(workspace or WORKSPACE_DIR)
            if file_info:
                messages[-1]["content"] = f"# Instruction\n{user_message}\n\n# Data\n{file_info}"
        
        assistant_reply = ""
        finished = False
        
        while not finished:
            # 调用 LLM API（流式）
            response = self.client.chat.completions.create(
                model=MODEL_PATH,
                messages=messages,
                temperature=0.4,
                stream=True,
                extra_body={
                    "stop_token_ids": [151676, 151645],
                    "max_new_tokens": 32768,
                },
            )
            
            cur_res = ""
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content is not None:
                    delta = chunk.choices[0].delta.content
                    cur_res += delta
                    assistant_reply += delta
                    yield delta  # 流式返回
                    
                    if "</Answer>" in cur_res:
                        finished = True
                        break
            
            # 检测代码块并执行
            if "</Code>" in cur_res and not finished:
                code_match = re.search(r"<Code>(.*?)</Code>", cur_res, re.DOTALL)
                if code_match:
                    code_content = code_match.group(1).strip()
                    # 提取 Python 代码
                    md_match = re.search(r"```(?:python)?(.*?)```", code_content, re.DOTALL)
                    code_str = md_match.group(1).strip() if md_match else code_content
                    
                    # 执行代码
                    exe_output = self.code_service.execute_code_safe(code_str, WORKSPACE_DIR)
                    
                    # 处理生成的文件
                    artifact_paths = self._handle_generated_files(WORKSPACE_DIR, GENERATED_DIR)
                    
                    # 构建执行结果块
                    exe_str = f"\n<Execute>\n```\n{exe_output}\n```\n</Execute>\n"
                    file_block = self._build_file_block(artifact_paths, WORKSPACE_DIR, session_id)
                    
                    yield exe_str + file_block
                    
                    # 添加执行结果到消息历史
                    messages.append({"role": "execute", "content": exe_output})


class ReportService:
    """报告导出服务 - 生成 PDF"""
    
    def export_report(self, messages: List[dict], title: str, session_id: str) -> dict:
        """
        导出报告为 PDF
        
        流程：
        1. 从消息中提取 <Analyze>/<Understand>/<Code>/<Execute>/<Answer> 标签内容
        2. 收集图片 URL 并下载
        3. 使用 reportlab 生成 PDF（支持中文）
        4. 返回下载链接
        """
        md_text, images = self.extract_sections_from_messages(messages)
        
        # 生成 PDF
        pdf_path = self.generate_pdf_with_images(md_text, images, base_name, export_dir, session_id)
        
        return {
            "pdf": pdf_path.name if pdf_path else None,
            "download_urls": {
                "pdf": self.workspace_service.build_download_url(f"{session_id}/generated/{pdf_path.name}"),
            }
        }
    
    def _find_chinese_font(self) -> Optional[str]:
        """查找系统中可用的中文字体"""
        font_paths = [
            "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/System/Library/Fonts/PingFang.ttc",
            "C:\\Windows\\Fonts\\msyh.ttc",
        ]
        for fp in font_paths:
            if os.path.exists(fp):
                return fp
        return None
    
    def generate_pdf_with_images(self, md_text, images, base_name, export_dir, session_id):
        """使用 reportlab 生成 PDF，支持中文和图片"""
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Image, PageBreak
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        
        # 注册中文字体
        chinese_font_path = self._find_chinese_font()
        if chinese_font_path:
            pdfmetrics.registerFont(TTFont("ChineseFont", chinese_font_path))
        
        # 构建 PDF 内容
        doc = SimpleDocTemplate(pdf_path, pagesize=A4)
        story = []
        
        # 解析 Markdown 并添加内容
        for line in md_text.split("\n"):
            if line.startswith("# "):
                story.append(Paragraph(line[2:], title_style))
            elif line.startswith("!["):
                # 添加图片
                img = Image(downloaded_images[url], width=5*inch, height=3*inch)
                story.append(img)
            else:
                story.append(Paragraph(line, body_style))
        
        doc.build(story)
        return pdf_path
```

---

#### workspace_service.py - 工作区服务

```python
# 位置：backend/services/workspace_service.py

import os
import shutil
from pathlib import Path
from config.settings import WORKSPACE_BASE_DIR, HTTP_SERVER_BASE

class WorkspaceService:
    """工作区管理服务 - 文件隔离与会话管理"""
    
    def __init__(self):
        self.base_dir = WORKSPACE_BASE_DIR
        os.makedirs(self.base_dir, exist_ok=True)
    
    def get_session_workspace(self, session_id: str) -> str:
        """
        获取会话专属工作区路径
        
        每个会话有独立的工作区目录，实现文件隔离
        """
        workspace_path = os.path.join(self.base_dir, session_id)
        os.makedirs(workspace_path, exist_ok=True)
        return workspace_path
    
    def build_download_url(self, relative_path: str) -> str:
        """构建文件下载 URL"""
        return f"{HTTP_SERVER_BASE}/{relative_path}"
    
    def list_files(self, session_id: str) -> list:
        """列出工作区文件"""
        workspace = self.get_session_workspace(session_id)
        files = []
        for root, dirs, filenames in os.walk(workspace):
            for filename in filenames:
                filepath = os.path.join(root, filename)
                relpath = os.path.relpath(filepath, workspace)
                files.append({
                    "name": filename,
                    "path": relpath,
                    "size": os.path.getsize(filepath),
                    "download_url": self.build_download_url(f"{session_id}/{relpath}"),
                })
        return files
    
    def upload_file(self, session_id: str, path: str, file_content: bytes) -> str:
        """上传文件到工作区"""
        workspace = self.get_session_workspace(session_id)
        target_path = os.path.join(workspace, path)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        
        with open(target_path, 'wb') as f:
            f.write(file_content)
        
        return target_path
    
    def delete_file(self, session_id: str, path: str) -> bool:
        """删除文件"""
        workspace = self.get_session_workspace(session_id)
        target_path = os.path.join(workspace, path)
        
        if os.path.isfile(target_path):
            os.remove(target_path)
            return True
        return False
    
    def delete_dir(self, session_id: str, path: str) -> bool:
        """删除目录"""
        workspace = self.get_session_workspace(session_id)
        target_path = os.path.join(workspace, path)
        
        if os.path.isdir(target_path):
            shutil.rmtree(target_path)
            return True
        return False
```

---

#### mock_server.py - Mock LLM 服务

```python
# 位置：backend/mock_server.py

"""
Mock LLM 服务 - 模拟 AI 聊天响应

运行在端口 8000，提供 OpenAI 兼容的 API 接口
用于开发测试，无需真实的 LLM 后端
"""

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import json
import asyncio

app = FastAPI()

# 预设响应模板
MOCK_RESPONSES = [
    "<Analyze>\n正在分析您的数据...\n</Analyze>\n\n",
    "<Understand>\n我理解您想要进行数据分析。\n</Understand>\n\n",
    "<Code>\n```python\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n# 分析代码\ndata = pd.read_csv('data.csv')\nplt.figure(figsize=(10, 6))\nplt.plot(data['x'], data['y'])\nplt.savefig('generated/result.png')\n```\n</Code>\n\n",
    "<Execute>\n代码执行成功，已生成图表。\n</Execute>\n\n",
    "<File>\n- [result.png](generated/result.png)\n![result.png](generated/result.png)\n</File>\n\n",
    "<Answer>\n分析完成，已生成可视化图表。\n</Answer>\n",
]

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    """OpenAI 兼容的聊天补全接口（流式响应）"""
    body = await request.json()
    messages = body.get("messages", [])
    
    async def generate():
        for chunk in MOCK_RESPONSES:
            # 模拟打字效果
            for char in chunk:
                response = {
                    "id": "chatcmpl-mock",
                    "object": "chat.completion.chunk",
                    "choices": [{
                        "index": 0,
                        "delta": {"content": char},
                        "finish_reason": None,
                    }]
                }
                yield f"data: {json.dumps(response)}\n\n"
                await asyncio.sleep(0.01)  # 模拟延迟
        
        # 结束标记
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

### 3. API 路由定义

#### main.py - FastAPI 应用入口

```python
# 位置：backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.workspace_routes import router as workspace_router
from routes.other_routes import router as other_router
from utils.http_server import start_http_server

app = FastAPI(title="Three Panel API")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(workspace_router, prefix="/workspace", tags=["workspace"])
app.include_router(other_router, tags=["other"])

# 启动 HTTP 文件服务器（端口 8100）
start_http_server(8100)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8200)
```

---

## 三、数据流程说明

### 1. 用户登录流程

```
┌─────────────┐    POST /api/auth/login    ┌─────────────┐
│   前端页面   │ ──────────────────────────> │ Next.js API │
│             │                             │   Route     │
└─────────────┘                             └──────┬──────┘
                                                   │
                                                   ▼ 验证用户
                                            ┌─────────────┐
                                            │  SQLite DB  │
                                            │  (用户表)    │
                                            └─────────────┘
                                                   │
                                                   ▼ 返回用户信息
┌─────────────┐    设置 auth-store    ┌─────────────┐
│   前端页面   │ <──────────────────── │   用户数据   │
│  (跳转主页)  │                       └─────────────┘
└─────────────┘
```

### 2. 聊天消息流程

```
┌─────────────┐    POST /v1/chat/completions    ┌─────────────┐
│   前端页面   │ ─────────────────────────────> │ Mock LLM    │
│  (useChat)  │                                │  (8000)     │
└─────────────┘                                └──────┬──────┘
       ▲                                              │
       │ SSE 流式响应                                  ▼
       │                                       生成 <Code> 标签
       │                                              │
       │                                              ▼
       │                                       ┌─────────────┐
       │                                       │ 代码执行    │
       │                                       │ (沙箱环境)  │
       │                                       └──────┬──────┘
       │                                              │
       │                                              ▼
       │                                       生成文件到 workspace
       │                                              │
       └──────────────────────────────────────────────┘
                      返回 <File> 块（包含图片链接）
```

### 3. 文件上传流程

```
┌─────────────┐    POST /workspace/upload-to    ┌─────────────┐
│   前端页面   │ ─────────────────────────────> │ FastAPI     │
│(useWorkspace)│     FormData(files)           │  (8200)     │
└─────────────┘                                └──────┬──────┘
                                                      │
                                                      ▼
                                               保存到 workspace/{session_id}/
                                                      │
                                                      ▼
                                               HTTP 服务器 (8100) 提供静态文件访问
                                                      │
┌─────────────┐    GET /{session_id}/file      ┌──────┴──────┐
│   前端预览   │ <──────────────────────────── │ HTTP Server │
│   下载      │                                │   (8100)    │
└─────────────┘                                └─────────────┘
```

### 4. PDF 导出流程

```
┌─────────────┐    POST /export/report    ┌─────────────┐
│   前端页面   │ ────────────────────────> │ FastAPI     │
│             │    {messages, session_id} │  (8200)     │
└─────────────┘                           └──────┬──────┘
                                                 │
                                                 ▼
                                          提取消息中的标签内容
                                          收集图片 URL 并下载
                                                 │
                                                 ▼
                                          注册中文字体
                                          构建 PDF 内容
                                                 │
                                                 ▼
                                          保存 PDF 到 workspace/{session_id}/generated/
                                                 │
┌─────────────┐    返回 download_urls      ┌──────┴──────┐
│   前端下载   │ <──────────────────────── │  PDF 路径   │
│             │                           └─────────────┘
└─────────────┘
```

---

## 四、扩展指南

### 1. 添加新的 API 端点

**后端：**
```python
# backend/controllers/new_controller.py
class NewController:
    async def new_endpoint(self, body: dict):
        # 处理逻辑
        return {"result": "ok"}

# backend/routes/other_routes.py
from controllers.new_controller import NewController

router = APIRouter()
new_controller = NewController()

@router.post("/new-endpoint")
async def new_endpoint(body: dict = Body(...)):
    return await new_controller.new_endpoint(body)
```

**前端：**
```typescript
// frontend/src/lib/config.ts
export const API_URLS = {
  // ...
  NEW_ENDPOINT: `${API_CONFIG.BACKEND_BASE_URL}/new-endpoint`,
};

// 使用
const response = await fetch(API_URLS.NEW_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'example' }),
});
```

### 2. 添加新的消息类型

```typescript
// frontend/src/components/three-panel/types.ts
export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'system'; // 添加 'system' 类型
  timestamp: Date;
  metadata?: {
    type: 'text' | 'code' | 'image' | 'file'; // 添加元数据
    language?: string;
    filename?: string;
  };
}
```

### 3. 添加新的 LLM 提供商

```python
# backend/services/llm_service.py
class LLMService:
    def __init__(self, provider: str = "openai"):
        if provider == "openai":
            self.client = openai.OpenAI(...)
        elif provider == "anthropic":
            import anthropic
            self.client = anthropic.Anthropic(...)
        elif provider == "local":
            # 使用本地模型
            pass
    
    async def generate_stream(self, messages: list):
        # 统一的流式生成接口
        for chunk in self.client.chat.completions.create(...):
            yield chunk
```

---

## 五、常见问题排查

### 1. 端口冲突

```bash
# 检查端口占用
lsof -i :3000  # 前端
lsof -i :8000  # Mock LLM
lsof -i :8100  # 文件服务
lsof -i :8200  # 后端 API

# 终止进程
kill -9 <PID>
```

### 2. 数据库问题

```bash
# 重置用户数据库
rm /home/z/my-project/db/custom.db
# 重启应用后会自动创建默认 admin 用户
```

### 3. 清除浏览器缓存

```javascript
// 在浏览器控制台执行
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## 六、性能优化建议

1. **前端**
   - 使用 `React.memo` 包装纯组件
   - 使用 `useMemo` 和 `useCallback` 缓存计算结果
   - 虚拟滚动长列表（聊天消息）
   - 代码分割（动态导入大型组件）

2. **后端**
   - 使用连接池管理数据库连接
   - 异步 I/O 操作
   - 缓存常用数据
   - 日志分级（开发/生产）

3. **文件服务**
   - 使用 CDN 分发静态文件
   - 启用 Gzip 压缩
   - 设置缓存头
