/**
 * API 配置
 * 所有请求使用相对路径，通过 Next.js API Routes 代理到后端
 */

// API URL 映射 - 使用相对路径，通过 Next.js API Routes 代理
export const API_URLS = {
  // 聊天相关 - 直接请求后端（流式响应需要）
  CHAT_COMPLETIONS: `/api/chat/completions`,
  CHAT_STOP: `/api/chat/stop`,
  CHAT_STREAM_SESSION: `/api/chat/stream-session`,
  
  // 报告导出
  EXPORT_REPORT: `/api/export/report`,
  
  // 代码执行
  EXECUTE_CODE: `/api/execute`,
  
  // 工作区相关
  WORKSPACE_FILES: `/api/workspace/files`,
  WORKSPACE_TREE: `/api/workspace/tree`,
  WORKSPACE_DELETE_FILE: `/api/workspace/file`,
  WORKSPACE_DELETE_DIR: `/api/workspace/dir`,
  WORKSPACE_UPLOAD_TO: `/api/workspace/upload-to`,
  WORKSPACE_CLEAR: `/api/workspace/clear`,
  WORKSPACE_MOVE: `/api/workspace/move`,
  
  // 代理
  PROXY: `/api/proxy`,
  
  // 认证相关 - 通过 Next.js API Routes
  AUTH_LOGIN: `/api/auth/login`,
  AUTH_LOGOUT: `/api/auth/logout`,
  AUTH_ME: `/api/auth/me`,
  AUTH_CHANGE_PASSWORD: `/api/auth/change-password`,
  
  // 用户管理
  USERS: `/api/users`,
  USER_RESET_PASSWORD: (userId: string) => `/api/users/${userId}/reset-password`,
  
  // 会话管理
  SESSIONS: `/api/sessions`,
  SESSION_MESSAGES: (sessionId: string) => `/api/sessions/${sessionId}/messages`,
  SESSION_MESSAGES_BATCH: (sessionId: string) => `/api/sessions/${sessionId}/messages/batch`,
};

/**
 * 创建带有认证的 fetch 请求
 * 使用 cookie 认证，无需手动添加 Authorization header
 * @param url 请求 URL
 * @param options fetch 选项
 * @returns fetch Promise
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Cookie 会自动携带，无需手动设置 Authorization header
  // Next.js API Routes 会从 cookie 读取 token 并转发给后端
  return fetch(url, {
    ...options,
    credentials: 'include', // 确保发送 cookie
    headers: {
      ...options.headers,
    },
  });
}

/**
 * 获取认证请求头（已弃用，保留兼容性）
 * @deprecated 使用 authFetch 代替
 */
export function getAuthHeaders(): Record<string, string> {
  return {};
}

// 后端服务地址（仅用于特殊场景）
export const API_CONFIG = {
  get BACKEND_BASE_URL() {
    return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8200";
  },
  get FILE_SERVER_BASE_URL() {
    return process.env.NEXT_PUBLIC_FILE_SERVER_URL || "http://localhost:8100";
  },
};
