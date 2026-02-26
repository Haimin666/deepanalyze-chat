'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThreePanelInterface } from "@/components/three-panel-interface";

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 增加全局 Token 拦截
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // 在认证完成前避免闪烁
  if (!isAuthenticated) return null;

  return (
    <main className="h-screen bg-background">
      <ThreePanelInterface />
    </main>
  );
}