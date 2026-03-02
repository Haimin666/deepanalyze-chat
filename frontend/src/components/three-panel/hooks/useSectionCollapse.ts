"use client";

import { useState, useEffect, useCallback } from "react";
import { StructuredSectionType } from "../types";

/**
 * Section 折叠状态管理 Hook
 */
export function useSectionCollapse(sessionId: string) {
  // 使用惰性初始化从 localStorage 读取
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(`collapsedSections:${sessionId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [autoCollapseEnabled, setAutoCollapseEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const savedAuto = localStorage.getItem("autoCollapseEnabled");
    return savedAuto !== "false";
  });

  const [manualLocks, setManualLocks] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const ml = localStorage.getItem(`manualLocks:${sessionId}`);
      return ml ? JSON.parse(ml) : {};
    } catch {
      return {};
    }
  });

  // 按 session 维度持久化 折叠状态与手动锁
  useEffect(() => {
    if (!sessionId) return;
    try {
      localStorage.setItem(
        `collapsedSections:${sessionId}`,
        JSON.stringify(collapsedSections)
      );
      localStorage.setItem(
        `manualLocks:${sessionId}`,
        JSON.stringify(manualLocks)
      );
    } catch { }
  }, [sessionId, collapsedSections, manualLocks]);

  // 切换自动折叠
  const toggleAutoCollapse = useCallback((enabled: boolean) => {
    setAutoCollapseEnabled(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("autoCollapseEnabled", enabled.toString());
    }
    // 关闭自动折叠时，展开所有块
    if (!enabled) {
      setCollapsedSections({});
      setManualLocks({});
    }
  }, []);

  // 切换单个 section 折叠
  const toggleSection = useCallback((sectionKey: string, baseKey: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev } as Record<string, boolean>;
      const current = (prev as any)[sectionKey] ?? (prev as any)[baseKey] ?? false;
      next[sectionKey] = !current;
      next[baseKey] = !current;
      return next;
    });
    setManualLocks((prev) => ({
      ...prev,
      [sectionKey]: true,
      [baseKey]: true,
    }));
  }, []);

  // 根据完整内容自动折叠
  const autoCollapseForContent = useCallback(
    (content: string, messageIndex?: number) => {
      if (!autoCollapseEnabled) return;
      const sectionTypes: StructuredSectionType[] = [
        "Analyze",
        "Understand",
        "Code",
        "Execute",
        "File",
        "Answer",
      ];
      const matches: Array<{ type: string; index: number; pos: number }> = [];
      sectionTypes.forEach((t) => {
        const re = new RegExp(`<${t}>([\\s\\S]*?)</${t}>`, "g");
        let m: RegExpExecArray | null;
        let local = 0;
        while ((m = re.exec(content)) !== null) {
          matches.push({ type: t, index: local++, pos: m.index });
        }
      });
      if (matches.length === 0) return;
      matches.sort((a, b) => a.pos - b.pos);
      const next: Record<string, boolean> = {};
      matches.forEach((m, i) => {
        const baseKey = `${m.type}-${i}`;
        const msgKey =
          messageIndex !== undefined ? `msg${messageIndex}-${m.type}-${i}` : null;
        const key = msgKey || baseKey;
        next[key] = i !== matches.length - 1;
      });
      setCollapsedSections((prev) => {
        const merged: Record<string, boolean> = { ...prev };
        for (const key in next) {
          const baseKey = key.replace(/^msg\d+-/, "");
          if (!manualLocks[key] && !manualLocks[baseKey]) merged[key] = next[key];
        }
        return merged;
      });
    },
    [autoCollapseEnabled, manualLocks]
  );

  // 展开指定 section
  const expandSection = useCallback((sectionKey: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev };
      const baseKey = sectionKey.replace(/^msg\d+-/, "");
      if (prev[sectionKey] || prev[baseKey]) {
        next[sectionKey] = false;
        next[baseKey] = false;
        return next;
      }
      return prev;
    });
    setManualLocks((prev) => {
      const baseKey = sectionKey.replace(/^msg\d+-/, "");
      return {
        ...prev,
        [sectionKey]: true,
        [baseKey]: true,
      };
    });
  }, []);

  // 获取 section 折叠状态
  const isSectionCollapsed = useCallback((msgKey: string, baseKey: string) => {
    return (
      (collapsedSections as any)[msgKey] ??
      (collapsedSections as any)[baseKey] ??
      false
    );
  }, [collapsedSections]);

  return {
    collapsedSections,
    autoCollapseEnabled,
    manualLocks,
    toggleAutoCollapse,
    toggleSection,
    autoCollapseForContent,
    expandSection,
    isSectionCollapsed,
  };
}
