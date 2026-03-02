/**
 * Zustand 状态管理 Store
 * 支持按用户隔离存储
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  // 用户隔离相关
  currentUserId: string | null;
  setCurrentUser: (userId: string | null) => void;
  // 会话操作
  setCurrentSession: (id: string) => void;
  createNewSession: () => string;
  deleteSession: (id: string) => void;
  saveCurrentSession: (title: string, messageCount: number, preview?: string, messages?: StoredMessage[]) => void;
  getSessionMessages: (id: string) => StoredMessage[] | undefined;
  setHasMessages: (has: boolean) => void;
  // 从后端加载会话
  loadSessionsFromBackend: (sessions: ChatSession[]) => void;
  clearAllSessions: () => void;
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

// 按用户隔离的存储 key
const getUserStorageKey = (userId: string | null) => {
  return userId ? `session-storage-${userId}` : "session-storage-guest";
};

// 会话 Store - 按用户隔离
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      currentSessionId: null,
      sessions: [],
      hasMessages: false,
      currentUserId: null,

      setCurrentUser: (userId) => {
        const currentUserId = get().currentUserId;
        // 如果用户变化，清空当前会话数据
        if (currentUserId !== userId) {
          set({
            currentUserId: userId,
            currentSessionId: null,
            sessions: [],
            hasMessages: false,
          });
        }
      },

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

      loadSessionsFromBackend: (backendSessions) => {
        // 从后端加载会话列表，合并本地消息
        const localSessions = get().sessions;
        const localSessionMap = new Map(
          localSessions.map(s => [s.id, s])
        );

        // 合并：后端会话 + 本地消息
        const mergedSessions = backendSessions.map(backendSession => {
          const localSession = localSessionMap.get(backendSession.id);
          return {
            ...backendSession,
            // 保留本地的消息数据
            messages: localSession?.messages || [],
          };
        });

        set({ sessions: mergedSessions });
      },

      clearAllSessions: () => {
        set({
          currentSessionId: null,
          sessions: [],
          hasMessages: false,
        });
      },
    }),
    {
      name: "session-storage", // 基础名称，实际会根据用户动态变化
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
        sessions: state.sessions,
        currentUserId: state.currentUserId,
      }),
    }
  )
);
