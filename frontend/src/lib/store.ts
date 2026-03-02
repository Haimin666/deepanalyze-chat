/**
 * Zustand 状态管理 Store
 * 纯内存状态，所有动态数据从后端 API 获取
 */
import { create } from "zustand";

// 用户类型
export interface User {
  id: string;
  name: string;
  username: string;
  role: "admin" | "user";
  createdAt: string;
}

// 存储的消息类型
export interface StoredMessage {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
  localOnly?: boolean;
}

// 聊天会话类型
export interface ChatSession {
  id: string;
  title: string;
  preview?: string;
  messageCount: number;
  updatedAt: string;
  messages?: StoredMessage[];
}

// 认证状态接口
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  lastActivity: number;
  sessionTimeout: number; // 毫秒
  login: (user: User, token: string) => void;
  logout: () => void;
  checkTimeout: () => boolean;
  updateActivity: () => void;
}

// 会话状态接口 - 纯内存，不持久化
interface SessionState {
  currentSessionId: string | null;
  sessions: ChatSession[];
  hasMessages: boolean;
  // 会话操作
  setCurrentSession: (id: string) => void;
  createNewSession: () => string;
  deleteSession: (id: string) => void;
  setSessions: (sessions: ChatSession[]) => void;
  updateSession: (id: string, data: Partial<ChatSession>) => void;
  setHasMessages: (has: boolean) => void;
  clearAllSessions: () => void;
}

// 认证 Store - 纯内存状态
export const useAuthStore = create<AuthState>()((set, get) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  lastActivity: Date.now(),
  sessionTimeout: 30 * 60 * 1000, // 30 分钟

  login: (user, token) => {
    set({
      isAuthenticated: true,
      user,
      token,
      lastActivity: Date.now(),
    });
  },

  logout: () => {
    set({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  },

  checkTimeout: () => {
    const { lastActivity, sessionTimeout, isAuthenticated } = get();
    if (!isAuthenticated) return false;
    
    const isTimeout = Date.now() - lastActivity > sessionTimeout;
    if (isTimeout) {
      set({ isAuthenticated: false, user: null, token: null });
    }
    return isTimeout;
  },

  updateActivity: () => {
    set({ lastActivity: Date.now() });
  },
}));

// 会话 Store - 纯内存状态，不持久化
export const useSessionStore = create<SessionState>()((set, get) => ({
  currentSessionId: null,
  sessions: [],
  hasMessages: false,

  setCurrentSession: (id) => {
    set({ currentSessionId: id });
  },

  createNewSession: () => {
    const newId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set({ currentSessionId: newId, hasMessages: false });
    return newId;
  },

  deleteSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
    }));
  },

  setSessions: (sessions) => {
    set({ sessions });
  },

  updateSession: (id, data) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, ...data } : s
      ),
    }));
  },

  setHasMessages: (has) => {
    set({ hasMessages: has });
  },

  clearAllSessions: () => {
    set({
      currentSessionId: null,
      sessions: [],
      hasMessages: false,
    });
  },
}));
