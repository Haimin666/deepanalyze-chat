/**
 * Zustand 状态管理 Store
 * 支持从 cookie 恢复登录状态
 * 支持 lastActivity 持久化到 localStorage，实现跨刷新的超时检测
 */
import { create } from "zustand";

// localStorage key for lastActivity
const LAST_ACTIVITY_KEY = "last_activity";

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
  initialized: boolean; // 是否已初始化
  timedOut: boolean; // 是否因超时而登出
  login: (user: User, token: string) => void;
  logout: () => void;
  checkTimeout: () => boolean;
  updateActivity: () => void;
  setSessionTimeout: (minutes: number) => void;
  restoreSession: (user: User) => void;
  setInitialized: (initialized: boolean) => void;
  restoreFromCookie: () => { restored: boolean; timedOut: boolean };
  clearTimedOut: () => void;
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

function parseUserFromCookie(): User | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'user_info' && value) {
      try {
        return JSON.parse(decodeURIComponent(value));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// 从 localStorage 获取 lastActivity
function getLastActivityFromStorage(): number | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

// 保存 lastActivity 到 localStorage
function saveLastActivityToStorage(timestamp: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ACTIVITY_KEY, timestamp.toString());
}

// 清除 lastActivity
function clearLastActivityFromStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

// 认证 Store - 支持从 cookie 恢复
export const useAuthStore = create<AuthState>()((set, get) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  lastActivity: Date.now(),
  sessionTimeout: 10 * 60 * 1000, // 默认 10 分钟
  initialized: false,
  timedOut: false,

  login: (user, token) => {
    const now = Date.now();
    saveLastActivityToStorage(now);
    set({
      isAuthenticated: true,
      user,
      token,
      lastActivity: now,
      initialized: true,
      timedOut: false,
    });
  },

  logout: () => {
    clearLastActivityFromStorage();
    set({
      isAuthenticated: false,
      user: null,
      token: null,
      timedOut: false,
    });
  },

  checkTimeout: () => {
    const { sessionTimeout, isAuthenticated, initialized } = get();
    // 未认证或未初始化时不检查超时
    if (!isAuthenticated || !initialized) return false;
    
    // 从 localStorage 获取最后活动时间
    const storedActivity = getLastActivityFromStorage();
    const lastActivity = storedActivity || Date.now();
    
    const isTimeout = Date.now() - lastActivity > sessionTimeout;
    if (isTimeout) {
      clearLastActivityFromStorage();
      set({ isAuthenticated: false, user: null, token: null, timedOut: true });
    }
    return isTimeout;
  },

  updateActivity: () => {
    const now = Date.now();
    saveLastActivityToStorage(now);
    set({ lastActivity: now });
  },

  setSessionTimeout: (minutes: number) => {
    set({ sessionTimeout: minutes * 60 * 1000 });
  },

  restoreSession: (user: User) => {
    const now = Date.now();
    saveLastActivityToStorage(now);
    set({
      isAuthenticated: true,
      user,
      lastActivity: now,
      initialized: true, // 恢复会话时设置 initialized
      timedOut: false,
    });
  },

  setInitialized: (initialized: boolean) => {
    set({ initialized });
  },

  clearTimedOut: () => {
    set({ timedOut: false });
  },

  // 从 cookie 恢复用户信息（无需调用后端 API）
  // 返回 { restored, timedOut }：
  // - restored: true 表示恢复成功
  // - timedOut: true 表示因超时而失败
  restoreFromCookie: () => {
    const user = parseUserFromCookie();
    if (user) {
      // 检查是否超时
      const { sessionTimeout } = get();
      const storedActivity = getLastActivityFromStorage();
      
      if (storedActivity) {
        const isTimeout = Date.now() - storedActivity > sessionTimeout;
        if (isTimeout) {
          // 超时，清除状态，需要重新登录
          clearLastActivityFromStorage();
          set({ timedOut: true });
          return { restored: false, timedOut: true };
        }
        // 未超时，恢复 lastActivity
        set({
          isAuthenticated: true,
          user,
          lastActivity: storedActivity,
          initialized: true,
          timedOut: false,
        });
      } else {
        // 没有 stored activity，可能是首次刷新，设置为当前时间
        const now = Date.now();
        saveLastActivityToStorage(now);
        set({
          isAuthenticated: true,
          user,
          lastActivity: now,
          initialized: true,
          timedOut: false,
        });
      }
      return { restored: true, timedOut: false };
    }
    return { restored: false, timedOut: false };
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
    const newSession: ChatSession = {
      id: newId,
      title: "新会话",
      messageCount: 0,
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ 
      currentSessionId: newId, 
      hasMessages: false,
      sessions: [newSession, ...state.sessions],
    }));
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
