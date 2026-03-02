"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

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
 * 主题管理 Hook
 * 纯内存状态，不持久化
 */
export function useTheme() {
  const mounted = useMounted();

  // 默认使用浅色模式，不读取 localStorage
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 更新主题 class
  const updateThemeClass = useCallback((isDark: boolean) => {
    if (typeof document !== "undefined") {
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  // 组件挂载后应用主题
  useEffect(() => {
    updateThemeClass(isDarkMode);
  }, [isDarkMode, updateThemeClass]);

  // 切换主题
  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const newDarkMode = !prev;
      updateThemeClass(newDarkMode);
      return newDarkMode;
    });
  }, [updateThemeClass]);

  return {
    isDarkMode,
    mounted,
    toggleTheme,
  };
}
