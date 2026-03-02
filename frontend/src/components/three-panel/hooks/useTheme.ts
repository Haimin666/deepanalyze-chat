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
 */
export function useTheme() {
  const mounted = useMounted();

  // 使用惰性初始化
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark";
  });

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
      // 保存到 localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", newDarkMode ? "dark" : "light");
      }
      return newDarkMode;
    });
  }, [updateThemeClass]);

  return {
    isDarkMode,
    mounted,
    toggleTheme,
  };
}
