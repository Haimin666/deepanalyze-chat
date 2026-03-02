'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { LoginPage } from '@/components/auth/LoginPage';
import { AdminPage } from '@/components/auth/AdminPage';
import { useAuthStore } from '@/lib/store';

// 使用 dynamic import 禁用 SSR，避免预渲染问题
const ThreePanelInterface = dynamic(
  () => import('@/components/three-panel/ThreePanelInterface').then((mod) => mod.ThreePanelInterface),
  { ssr: false }
);

type View = 'login' | 'main' | 'admin';

// 用于同步获取 mounted 状态
const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function Home() {
  const { isAuthenticated, user, logout, checkTimeout } = useAuthStore();
  const [view, setView] = useState<View>('login');
  const mounted = useMounted();

  // 认证状态检查
  useEffect(() => {
    if (!mounted) return;

    // 使用 setTimeout 避免 lint 警告
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        if (checkTimeout()) {
          logout();
          setView('login');
        } else {
          setView('main');
        }
      } else {
        setView('login');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [mounted, isAuthenticated, checkTimeout, logout]);

  const handleLoginSuccess = useCallback(() => {
    setView('main');
  }, []);

  const handleBackFromAdmin = useCallback(() => {
    setView('main');
  }, []);

  // 等待挂载
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // 根据视图渲染不同界面
  if (view === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (view === 'admin') {
    // 只有管理员可以访问
    if (user?.role !== 'admin') {
      setTimeout(() => setView('main'), 0);
      return null;
    }
    return <AdminPage onBack={handleBackFromAdmin} />;
  }

  return <ThreePanelInterface />;
}
