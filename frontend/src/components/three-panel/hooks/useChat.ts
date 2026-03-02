"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { API_URLS } from "@/lib/config";
import { useSessionStore, StoredMessage } from "@/lib/store";
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
 * 支持按会话存储和加载消息
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

  // 从 store 获取方法
  const { setHasMessages, sessions, saveCurrentSession, getSessionMessages } = useSessionStore();

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

  // 会话变化时加载消息
  useEffect(() => {
    if (!sessionId) return;

    // 尝试从会话历史加载消息
    const storedMessages = getSessionMessages(sessionId);

    if (storedMessages && storedMessages.length > 0) {
      const restored = storedMessages.map((m) => ({
        ...m,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      })) as Message[];
      setMessages(restored);
      setHasMessages(true);
    } else {
      // 新会话，显示欢迎消息
      const welcome: Message = {
        id: `welcome-${Date.now()}`,
        content: "Hello! I'm DeepAnalyze-8B, your autonomous data science assistant. Upload your data and let's explore it together!",
        sender: "ai",
        timestamp: new Date(),
        localOnly: true,
      };
      setMessages([welcome]);
      setHasMessages(false);
    }
  }, [sessionId, getSessionMessages, setHasMessages]);

  // 更新 hasMessages 状态
  useEffect(() => {
    const hasRealMessages = messages.some((m) => !m.localOnly);
    setHasMessages(hasRealMessages);
  }, [messages, setHasMessages]);

  // 保存会话到历史
  const saveSessionToHistory = useCallback(() => {
    const realMessages = messages.filter((m) => !m.localOnly);
    if (realMessages.length === 0) return;

    const lastUserMessage = [...realMessages].reverse().find((m) => m.sender === "user");
    const title = lastUserMessage?.content.slice(0, 50) || "新会话";
    const preview = messages[messages.length - 1]?.content.slice(0, 100);

    // 转换消息为存储格式
    const storedMessages: StoredMessage[] = messages.map((m) => ({
      id: m.id,
      content: m.content,
      sender: m.sender,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
      localOnly: m.localOnly,
    }));

    saveCurrentSession(title, messages.length, preview, storedMessages);
  }, [messages, saveCurrentSession]);

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
  }, [isTyping, setHasMessages]);

  // 加载指定会话的消息
  const loadSessionMessages = useCallback((sessionMessages: Message[]) => {
    setMessages(sessionMessages);
    setHasMessages(sessionMessages.some((m) => !m.localOnly));
  }, [setHasMessages]);

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;
    const baseMessageIndex = messages.length;
    const aiMessageIndex = baseMessageIndex + 1;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch(API_URLS.CHAT_COMPLETIONS, {
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
              content: inputValue,
            },
          ],
          stream: true,
          session_id: sessionId,
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 非流式 JSON
      if (contentType.includes("application/json")) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || "";
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "ai",
            content,
            timestamp: new Date(),
          },
        ]);
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

      await onLoadWorkspaceFiles();
      await onLoadWorkspaceTree();
      setIsTyping(false);
      setStreamingMessageId(null);

    } catch (error) {
      console.error("Error sending message:", error);
      setIsTyping(false);
      setStreamingMessageId(null);
    }
  }, [inputValue, messages, sessionId, onLoadWorkspaceFiles, onLoadWorkspaceTree, autoCollapseForContent]);

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
    scrollToBottom,
    saveSessionToHistory,
    loadSessionMessages,
    getPrevUserQuestionText: (index: number) => getPrevUserQuestionText(messages, index),
  };
}
