// 认证和用户管理类型定义

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  messages: ChatSessionMessage[];
  createdAt: string;
  updatedAt: string;
  title: string;
}

export interface ChatSessionMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
