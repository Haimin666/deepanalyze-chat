/**
 * API 配置
 */

// 后端服务地址
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8200";

// 文件服务器地址
const FILE_SERVER_BASE_URL = process.env.NEXT_PUBLIC_FILE_SERVER_URL || "http://localhost:8100";

// API 配置对象
export const API_CONFIG = {
  BACKEND_BASE_URL,
  FILE_SERVER_BASE_URL,
};

/**
 * 获取认证请求头
 * 从 localStorage 读取 auth-storage 中的 token
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }
  
  try {
    const authStorageStr = localStorage.getItem("auth-storage");
    if (!authStorageStr) {
      return {};
    }
    
    const authStorage = JSON.parse(authStorageStr);
    const token = authStorage?.state?.token;
    
    if (!token) {
      return {};
    }
    
    return {
      "Authorization": `Bearer ${token}`,
    };
  } catch (e) {
    console.error("Failed to get auth headers:", e);
    return {};
  }
}

/**
 * 创建带有认证的 fetch 请求
 * @param url 请求 URL
 * @param options fetch 选项
 * @returns fetch Promise
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  
  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      ...authHeaders,
    },
  };
  
  return fetch(url, mergedOptions);
}

// API URL 映射
export const API_URLS = {
  // 聊天相关
  CHAT_COMPLETIONS: `${BACKEND_BASE_URL}/chat/completions`,
  
  // 报告导出
  EXPORT_REPORT: `${BACKEND_BASE_URL}/export/report`,
  
  // 代码执行
  EXECUTE_CODE: `${BACKEND_BASE_URL}/execute`,
  
  // 工作区相关
  WORKSPACE_FILES: `${BACKEND_BASE_URL}/workspace/files`,
  WORKSPACE_TREE: `${BACKEND_BASE_URL}/workspace/tree`,
  WORKSPACE_DELETE_FILE: `${BACKEND_BASE_URL}/workspace/file`,
  WORKSPACE_DELETE_DIR: `${BACKEND_BASE_URL}/workspace/dir`,
  WORKSPACE_UPLOAD_TO: `${BACKEND_BASE_URL}/workspace/upload-to`,
  WORKSPACE_CLEAR: `${BACKEND_BASE_URL}/workspace/clear`,
  
  // 代理
  PROXY: `${BACKEND_BASE_URL}/proxy`,
  
  // 认证相关 - 后端数据库API
  AUTH_LOGIN: `${BACKEND_BASE_URL}/auth/login`,
  AUTH_LOGOUT: `${BACKEND_BASE_URL}/auth/logout`,
  AUTH_ME: `${BACKEND_BASE_URL}/auth/me`,
  AUTH_CHANGE_PASSWORD: `${BACKEND_BASE_URL}/auth/change-password`,
  
  // 用户管理
  USERS: `${BACKEND_BASE_URL}/users`,
  
  // 会话管理
  SESSIONS: `${BACKEND_BASE_URL}/sessions`,
  SESSION_MESSAGES: (sessionId: string) => `${BACKEND_BASE_URL}/sessions/${sessionId}/messages`,
  SESSION_MESSAGES_BATCH: (sessionId: string) => `${BACKEND_BASE_URL}/sessions/${sessionId}/messages/batch`,
};
