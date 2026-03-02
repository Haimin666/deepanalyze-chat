"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from './auth-types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  lastActivity: number;
  
  // Actions
  login: (user: User) => void;
  logout: () => void;
  updateActivity: () => void;
  checkTimeout: () => boolean;
}

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      lastActivity: Date.now(),

      login: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          lastActivity: Date.now(),
        });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          lastActivity: 0,
        });
      },

      updateActivity: () => {
        set({ lastActivity: Date.now() });
      },

      checkTimeout: () => {
        const { lastActivity, isAuthenticated } = get();
        if (!isAuthenticated) return false;
        
        const now = Date.now();
        const isTimedOut = now - lastActivity > INACTIVITY_TIMEOUT;
        
        if (isTimedOut) {
          set({
            user: null,
            isAuthenticated: false,
            lastActivity: 0,
          });
          return true;
        }
        
        return false;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
    }
  )
);

// Session history store
interface SessionState {
  sessions: Session[];
  currentSessionId: string | null;
  
  // Actions
  loadSessions: (userId: string) => void;
  saveSession: (session: Session) => void;
  deleteSession: (sessionId: string) => void;
  setCurrentSession: (sessionId: string | null) => void;
  getCurrentSession: () => Session | null;
  createNewSession: (userId: string) => Session;
}

const SESSIONS_STORAGE_KEY = 'chat_sessions';

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,

      loadSessions: (userId: string) => {
        if (typeof window === 'undefined') return;
        try {
          const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
          if (raw) {
            const allSessions = JSON.parse(raw) as Session[];
            const userSessions = allSessions.filter(s => s.userId === userId);
            set({ sessions: userSessions });
          }
        } catch (e) {
          console.error('Failed to load sessions:', e);
        }
      },

      saveSession: (session: Session) => {
        if (typeof window === 'undefined') return;
        try {
          const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
          let allSessions: Session[] = raw ? JSON.parse(raw) : [];
          
          const existingIndex = allSessions.findIndex(s => s.id === session.id);
          if (existingIndex >= 0) {
            allSessions[existingIndex] = session;
          } else {
            allSessions.push(session);
          }
          
          localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(allSessions));
          
          set((state) => {
            const sessions = [...state.sessions];
            const idx = sessions.findIndex(s => s.id === session.id);
            if (idx >= 0) {
              sessions[idx] = session;
            } else {
              sessions.push(session);
            }
            return { sessions };
          });
        } catch (e) {
          console.error('Failed to save session:', e);
        }
      },

      deleteSession: (sessionId: string) => {
        if (typeof window === 'undefined') return;
        try {
          const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
          let allSessions: Session[] = raw ? JSON.parse(raw) : [];
          allSessions = allSessions.filter(s => s.id !== sessionId);
          localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(allSessions));
          
          set((state) => ({
            sessions: state.sessions.filter(s => s.id !== sessionId),
          }));
        } catch (e) {
          console.error('Failed to delete session:', e);
        }
      },

      setCurrentSession: (sessionId: string | null) => {
        set({ currentSessionId: sessionId });
      },

      getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        if (!currentSessionId) return null;
        return sessions.find(s => s.id === currentSessionId) || null;
      },

      createNewSession: (userId: string) => {
        const newSession: Session = {
          id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          title: 'New Chat',
        };
        
        const { saveSession, setCurrentSession } = get();
        saveSession(newSession);
        setCurrentSession(newSession.id);
        
        return newSession;
      },
    }),
    {
      name: 'session-state',
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);
