"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { configureMonaco } from "@/lib/monaco-config";

// 用于同步获取 mounted 状态
const emptySubscribe = () => () => { };

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * Session 管理 Hook
 * 提供初始 sessionId，用于在 store 初始化之前使用
 */
export function useSession() {
  const mounted = useMounted();

  // 使用惰性初始化，只获取初始值
  const [initialSessionId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    
    // 先尝试从 localStorage 获取已存储的 sessionId
    try {
      const storedSessionId = localStorage.getItem("session-storage");
      if (storedSessionId) {
        const parsed = JSON.parse(storedSessionId);
        if (parsed.state?.currentSessionId) {
          return parsed.state.currentSessionId;
        }
      }
    } catch { }
    
    // 否则创建新的初始 sessionId
    const sid = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    return sid;
  });

  useEffect(() => {
    // 配置 Monaco Editor（只需执行一次）
    configureMonaco();
  }, []);

  return {
    sessionId: initialSessionId,
    mounted,
  };
}
