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
 * 提供初始 sessionId，纯内存状态
 */
export function useSession() {
  const mounted = useMounted();

  // 使用惰性初始化，只创建一个新的 sessionId
  const [initialSessionId] = useState<string>(() => {
    const sid = `session-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;
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
