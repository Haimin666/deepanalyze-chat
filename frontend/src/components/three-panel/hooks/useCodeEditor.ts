"use client";

import { useState, useCallback, useRef } from "react";
import type React from "react";
import { API_URLS } from "@/lib/config";

/**
 * 代码编辑器管理 Hook
 */
export function useCodeEditor(sessionId: string) {
  const [editorHeight, setEditorHeight] = useState(60);
  const [selectedCodeSection, setSelectedCodeSection] = useState<string>("");
  const [codeEditorContent, setCodeEditorContent] = useState("");
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  const [codeExecutionResult, setCodeExecutionResult] = useState("");

  // 处理拖动调整大小
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = editorHeight;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector(".editor-container");
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const deltaY = e.clientY - startY;
      const containerHeight = containerRect.height;
      const deltaPercent = (deltaY / containerHeight) * 100;

      const newHeight = Math.min(Math.max(startHeight + deltaPercent, 20), 80);
      setEditorHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [editorHeight]);

  // 执行代码
  const executeCode = useCallback(async () => {
    setIsExecutingCode(true);
    try {
      const response = await fetch(API_URLS.EXECUTE_CODE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: codeEditorContent,
          session_id: sessionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCodeExecutionResult(data.result);
      } else {
        setCodeExecutionResult("Error: Failed to execute code");
      }
    } catch (error) {
      setCodeExecutionResult(`Error: ${error}`);
    } finally {
      setIsExecutingCode(false);
    }
  }, [codeEditorContent, sessionId]);

  // 打开代码编辑器
  const openCodeEditor = useCallback((code: string) => {
    setCodeEditorContent(code);
    setSelectedCodeSection(code);
    setShowCodeEditor(true);
  }, []);

  // 关闭代码编辑器
  const closeCodeEditor = useCallback(() => {
    setShowCodeEditor(false);
    setCodeEditorContent("");
    setSelectedCodeSection("");
    setCodeExecutionResult("");
  }, []);

  return {
    editorHeight,
    selectedCodeSection,
    codeEditorContent,
    setCodeEditorContent,
    showCodeEditor,
    isExecutingCode,
    codeExecutionResult,
    handleMouseDown,
    executeCode,
    openCodeEditor,
    closeCodeEditor,
  };
}
