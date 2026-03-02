/**
 * Zustand 状态管理 Store
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

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

// 会话状态接口
interface SessionState {
  currentSessionId: string | null;
  sessions: ChatSession[];
  hasMessages: boolean;
  setCurrentSession: (id: string) => void;
  createNewSession: () => string;
  deleteSession: (id: string) => void;
  saveCurrentSession: (title: string, messageCount: number, preview?: string, messages?: StoredMessage[]) => void;
  getSessionMessages: (id: string) => StoredMessage[] | undefined;
  setHasMessages: (has: boolean) => void;
}

// 认证 Store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        lastActivity: state.lastActivity,
      }),
    }
  )
);

// 会话 Store
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
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

      saveCurrentSession: (title, messageCount, preview, messages) => {
        const { currentSessionId, sessions } = get();
        if (!currentSessionId) return;

        const existingIndex = sessions.findIndex((s) => s.id === currentSessionId);
        const session: ChatSession = {
          id: currentSessionId,
          title,
          messageCount,
          preview,
          updatedAt: new Date().toISOString(),
          messages,
        };

        if (existingIndex >= 0) {
          const newSessions = [...sessions];
          newSessions[existingIndex] = session;
          set({ sessions: newSessions });
        } else {
          set({ sessions: [session, ...sessions] });
        }
      },

      getSessionMessages: (id) => {
        const session = get().sessions.find((s) => s.id === id);
        return session?.messages;
      },

      setHasMessages: (has) => {
        set({ hasMessages: has });
      },
    }),
    {
      name: "session-storage",
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
        sessions: state.sessions,
      }),
    }
  )
);
