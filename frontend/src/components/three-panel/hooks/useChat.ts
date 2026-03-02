"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { API_URLS, authFetch } from "@/lib/config";
import { useSessionStore } from "@/lib/store";
import { Message } from "../types";
import { getPrevUserQuestionText } from "../utils";

const WELCOME_MESSAGE: Message = {
  id: "welcome-1",
  content: "Hello! I'm DeepAnalyze-8B, your autonomous data science assistant. Upload your data and let's explore it together!",
  sender: "ai",
  timestamp: new Date(),
  localOnly: true,
};

/**
 * 聊天管理 Hook
 * 消息会保存到后端数据库
 */
export function useChat(
  sessionId: string,
  onLoadWorkspaceFiles: () => Promise<void>,
  onLoadWorkspaceTree: () => Promise<void>,
  autoCollapseForContent: (content: string, messageIndex?: number) => void
) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTimeRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);
  const stickToBottomRef = useRef(true);
  const aiPendingContentRef = useRef<string>("");
  const streamRafRef = useRef<number | null>(null);
  
  // 流式会话ID，用于停止功能
  const streamSessionIdRef = useRef<string | null>(null);
  // AbortController 用于取消请求
  const abortControllerRef = useRef<AbortController | null>(null);
  // 标记是否已保存过消息，避免重复保存
  const savedMessagesRef = useRef<Set<string>>(new Set());

  // 从 store 获取方法
  const setHasMessages = useSessionStore((state) => state.setHasMessages);
  const updateSession = useSessionStore((state) => state.updateSession);
  const sessions = useSessionStore((state) => state.sessions);

  // 保存消息到后端
  const saveMessageToBackend = useCallback(async (
    sessionId: string,
    role: "user" | "assistant",
    content: string
  ) => {
    try {
      const response = await authFetch(API_URLS.SESSION_MESSAGES(sessionId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      });
      
      if (!response.ok) {
        console.error("Failed to save message to backend:", await response.text());
        return false;
      }
      
      const result = await response.json();
      
      // 更新会话列表中的预览和标题
      const preview = content.slice(0, 100);
      const updateData: { preview: string; title?: string } = { preview };
      
      // 如果后端返回了新标题，更新标题
      if (result.title) {
        updateData.title = result.title;
      }
      
      updateSession(sessionId, updateData);
      
      return true;
    } catch (error) {
      console.error("Error saving message to backend:", error);
      return false;
    }
  }, [updateSession]);

  // 确保会话存在于后端
  const ensureSessionExists = useCallback(async (sessionId: string) => {
    try {
      // 先检查会话是否存在
      const checkResponse = await authFetch(`${API_URLS.SESSIONS}/${sessionId}`, {
        method: "GET",
      });
      
      if (checkResponse.ok) {
        return true; // 会话已存在
      }
      
      // 会话不存在，创建新会话
      const createResponse = await authFetch(API_URLS.SESSIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: sessionId, 
          title: "新会话" 
        }),
      });
      
      return createResponse.ok;
    } catch (error) {
      console.error("Error ensuring session exists:", error);
      return false;
    }
  }, []);

  // 节流滚动到底部
  const scrollToBottom = useCallback((force: boolean = false) => {
    const now = Date.now();
    const timeSinceLastScroll = now - lastScrollTimeRef.current;

    if (!force && timeSinceLastScroll < 100) {
      return;
    }

    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        container.scrollTop = container.scrollHeight;
        stickToBottomRef.current = true;
        lastScrollTimeRef.current = Date.now();
      }
      scrollRafRef.current = null;
    });
  }, []);

  // 输入完成后平滑滚动到底部
  useEffect(() => {
    if (isTyping) return;
    if (!stickToBottomRef.current) return;
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  }, [isTyping]);

  // 监听消息变化
  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollToBottom(!!streamingMessageId);
    }
  }, [messages, scrollToBottom, streamingMessageId]);

  // 会话变化时重置消息
  useEffect(() => {
    if (!sessionId) return;
    
    // 新会话，显示欢迎消息（消息从后端按需加载）
    const welcome: Message = {
      id: `welcome-${Date.now()}`,
      content: "Hello! I'm DeepAnalyze-8B, your autonomous data science assistant. Upload your data and let's explore it together!",
      sender: "ai",
      timestamp: new Date(),
      localOnly: true,
    };
    setMessages([welcome]);
    setHasMessages(false);
    savedMessagesRef.current.clear();
  }, [sessionId, setHasMessages]);

  // 更新 hasMessages 状态
  useEffect(() => {
    const hasRealMessages = messages.some((m) => !m.localOnly);
    setHasMessages(hasRealMessages);
  }, [messages, setHasMessages]);

  // 清空聊天
  const clearChat = useCallback(() => {
    if (isTyping) {
      return;
    }
    const welcome: Message = {
      id: `welcome-${Date.now()}`,
      content: "Hello! I'm DeepAnalyze-8B, your autonomous data science assistant. Upload your data and let's explore it together!",
      sender: "ai",
      timestamp: new Date(),
      localOnly: true,
    };
    setMessages([welcome]);
    setHasMessages(false);
    savedMessagesRef.current.clear();
  }, [isTyping, setHasMessages]);

  // 加载指定会话的消息（从后端加载）
  const loadSessionMessages = useCallback((sessionMessages: Message[]) => {
    setMessages(sessionMessages);
    setHasMessages(sessionMessages.some((m) => !m.localOnly));
    savedMessagesRef.current.clear();
    // 标记已加载的消息为已保存
    sessionMessages.forEach((m) => {
      if (!m.localOnly) {
        savedMessagesRef.current.add(m.id);
      }
    });
  }, [setHasMessages]);

  // 停止生成
  const stopGeneration = useCallback(async () => {
    // 1. 取消前端请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 2. 通知后端停止
    if (streamSessionIdRef.current) {
      try {
        await authFetch(API_URLS.CHAT_STOP, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stream_session_id: streamSessionIdRef.current }),
        });
      } catch (e) {
        console.error("Failed to notify backend to stop:", e);
      }
      streamSessionIdRef.current = null;
    }

    // 3. 清理前端状态
    if (streamRafRef.current) {
      cancelAnimationFrame(streamRafRef.current);
      streamRafRef.current = null;
    }

    setIsTyping(false);
    setStreamingMessageId(null);
  }, []);

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;
    const baseMessageIndex = messages.length;
    const aiMessageIndex = baseMessageIndex + 1;

    const userMessageId = Date.now().toString();
    const userMessage: Message = {
      id: userMessageId,
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userContent = inputValue; // 保存用户消息内容
    setInputValue("");
    setIsTyping(true);

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    try {
      // 确保会话存在于后端
      await ensureSessionExists(sessionId);
      
      // 保存用户消息到后端
      if (!savedMessagesRef.current.has(userMessageId)) {
        await saveMessageToBackend(sessionId, "user", userContent);
        savedMessagesRef.current.add(userMessageId);
      }

      // 创建流式会话ID
      let streamSessionId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      streamSessionIdRef.current = streamSessionId;

      const response = await authFetch(API_URLS.CHAT_COMPLETIONS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "DeepAnalyze-8B",
          messages: [
            ...messages
              .filter((m) => !m.localOnly)
              .map((msg) => ({
                role: msg.sender === "user" ? "user" : "assistant",
                content: msg.content,
              })),
            {
              role: "user",
              content: userContent,
            },
          ],
          stream: true,
          session_id: sessionId,
          stream_session_id: streamSessionId,
        }),
        signal: abortControllerRef.current.signal,
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 非流式 JSON
      if (contentType.includes("application/json")) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || "";
        const aiMsgId = Date.now().toString();
        setMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            sender: "ai",
            content,
            timestamp: new Date(),
          },
        ]);
        
        // 保存 AI 消息到后端
        await saveMessageToBackend(sessionId, "assistant", content);
        savedMessagesRef.current.add(aiMsgId);
        
        autoCollapseForContent(content, aiMessageIndex);
        if (content.includes("<File>")) {
          await onLoadWorkspaceTree();
          await onLoadWorkspaceFiles();
        }
        setIsTyping(false);
        return;
      }

      // 流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setIsTyping(false);
        setStreamingMessageId(null);
        return;
      }

      const aiMsgId = `${Date.now()}-${Math.random()}`;
      setStreamingMessageId(aiMsgId);
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: "ai",
          content: "",
          timestamp: new Date(),
        },
      ]);

      aiPendingContentRef.current = "";

      if (streamRafRef.current) {
        cancelAnimationFrame(streamRafRef.current);
        streamRafRef.current = null;
      }

      let accumulatedMessage = "";

      const flushAiMessage = (visibleText: string) => {
        setMessages((prev) => {
          const next = [...prev];
          const idx = next.findIndex((m) => m.id === aiMsgId);
          if (idx >= 0) {
            next[idx] = { ...next[idx], content: visibleText };
          }
          return next;
        });

        if (visibleText.includes("<File>")) {
          setTimeout(async () => {
            await onLoadWorkspaceTree();
            await onLoadWorkspaceFiles();
          }, 300);
        }
      };

      const loop = () => {
        const pending = aiPendingContentRef.current;

        if (aiPendingContentRef.current !== pending) {
          const diff = pending.length - aiPendingContentRef.current.length;
          if (diff < 0) {
            aiPendingContentRef.current = pending;
            flushAiMessage(pending);
          } else {
            const step = Math.max(1, Math.ceil(diff / 5));
            const next = pending.slice(0, aiPendingContentRef.current.length + step);
            aiPendingContentRef.current = next;
            flushAiMessage(next);
          }
        }
        streamRafRef.current = requestAnimationFrame(loop);
      };
      streamRafRef.current = requestAnimationFrame(loop);

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === "data: [DONE]") continue;

          try {
            const json = JSON.parse(trimmed);
            const deltaContent = json.choices?.[0]?.delta?.content;

            if (deltaContent) {
              accumulatedMessage += deltaContent;
              aiPendingContentRef.current = accumulatedMessage;
            }
          } catch (e) {
            console.warn("JSON parse error for line:", trimmed, e);
          }
        }
      }

      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer.trim());
          const deltaContent = json.choices?.[0]?.delta?.content;
          if (deltaContent) {
            accumulatedMessage += deltaContent;
            aiPendingContentRef.current = accumulatedMessage;
          }
        } catch (e) { }
      }

      if (streamRafRef.current) {
        cancelAnimationFrame(streamRafRef.current);
        streamRafRef.current = null;
      }
      flushAiMessage(accumulatedMessage);
      autoCollapseForContent(accumulatedMessage, aiMessageIndex);

      // 保存 AI 消息到后端
      if (accumulatedMessage && !savedMessagesRef.current.has(aiMsgId)) {
        await saveMessageToBackend(sessionId, "assistant", accumulatedMessage);
        savedMessagesRef.current.add(aiMsgId);
      }

      await onLoadWorkspaceFiles();
      await onLoadWorkspaceTree();
      setIsTyping(false);
      setStreamingMessageId(null);

    } catch (error: unknown) {
      // 如果是用户主动取消，不显示错误
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request aborted by user");
      } else {
        console.error("Error sending message:", error);
      }
      setIsTyping(false);
      setStreamingMessageId(null);
    }
  }, [inputValue, messages, sessionId, onLoadWorkspaceFiles, onLoadWorkspaceTree, autoCollapseForContent, ensureSessionExists, saveMessageToBackend]);

  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isTyping,
    setIsTyping,
    streamingMessageId,
    messagesEndRef,
    messagesContainerRef,
    stickToBottomRef,
    clearChat,
    handleSendMessage,
    stopGeneration,
    scrollToBottom,
    loadSessionMessages,
    getPrevUserQuestionText: (index: number) => getPrevUserQuestionText(messages, index),
  };
}
