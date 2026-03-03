"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { API_URLS, authFetch } from "@/lib/config";
import {
  useAuthStore,
  useSessionStore,
} from "@/lib/store";
import { LoginPage } from "@/components/auth/LoginPage";
import { AdminPage } from "@/components/auth/AdminPage";
import { Loader2 } from "lucide-react";

// 直接从各个文件导入，避免循环依赖
import { LeftPanel } from "./LeftPanel";
import { MiddlePanel } from "./MiddlePanel";
import { RightPanel } from "./RightPanel";
import { StepNavigator } from "./StepNavigator";
import { ContextMenu } from "./ContextMenu";
import { useMessageRenderer } from "./MessageRenderer";
import { useTheme } from "./hooks/useTheme";
import { useWorkspace } from "./hooks/useWorkspace";
import { useChat } from "./hooks/useChat";
import { useCodeEditor } from "./hooks/useCodeEditor";
import { usePreview } from "./hooks/usePreview";
import { useSectionCollapse } from "./hooks/useSectionCollapse";
import { useSession } from "./hooks/useSession";
import type { WorkspaceNode, WorkspaceFile, ArborNode } from "./types";
import { ensureGeneratedInUrl } from "./url-utils";
import { UserAvatar } from "./UserAvatar";
import type { Message } from "./types";

type AppView = "login" | "main" | "admin" | "loading";

export function ThreePanelInterface() {
  const { toast } = useToast();
  const [view, setView] = useState<AppView>("loading");

  // Auth 状态
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const checkTimeout = useAuthStore((state) => state.checkTimeout);
  const updateActivity = useAuthStore((state) => state.updateActivity);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const setSessionTimeout = useAuthStore((state) => state.setSessionTimeout);
  const initialized = useAuthStore((state) => state.initialized);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const restoreFromCookie = useAuthStore((state) => state.restoreFromCookie);
  const timedOut = useAuthStore((state) => state.timedOut);
  const clearTimedOut = useAuthStore((state) => state.clearTimedOut);

  // 会话历史状态 - 纯内存
  const currentSessionId = useSessionStore((state) => state.currentSessionId);
  const sessions = useSessionStore((state) => state.sessions);
  const setCurrentSession = useSessionStore((state) => state.setCurrentSession);
  const deleteSession = useSessionStore((state) => state.deleteSession);
  const createNewSession = useSessionStore((state) => state.createNewSession);
  const setSessions = useSessionStore((state) => state.setSessions);
  const clearAllSessions = useSessionStore((state) => state.clearAllSessions);
  const hasMessages = useSessionStore((state) => state.hasMessages);
  const setHasMessages = useSessionStore((state) => state.setHasMessages);
  const updateSession = useSessionStore((state) => state.updateSession);

  // Session 管理 - 获取初始 sessionId
  const { sessionId: initialSessionId, mounted } = useSession();

  // 实际使用的 sessionId - 优先使用 store 中的，否则使用初始值
  const sessionId = currentSessionId || initialSessionId;

  // 初始化 store 的 currentSessionId
  useEffect(() => {
    if (mounted && initialSessionId && !currentSessionId) {
      setCurrentSession(initialSessionId);
    }
  }, [mounted, initialSessionId, currentSessionId, setCurrentSession]);

  // 主题管理
  const { isDarkMode, toggleTheme } = useTheme();

  // 用户变化时重新加载数据
  const prevUserIdRef = useRef<string | null>(null);

  // 初始化：从 cookie 恢复登录状态
  useEffect(() => {
    if (initialized) return;

    const initAuth = async () => {
      try {
        // 1. 获取配置的超时时间
        const configRes = await fetch('/api/auth/config');
        if (configRes.ok) {
          const config = await configRes.json();
          if (config.sessionTimeoutMinutes) {
            setSessionTimeout(config.sessionTimeoutMinutes);
          }
        }

        // 2. 优先从 cookie 恢复用户信息
        const result = restoreFromCookie();
        
        if (result.timedOut) {
          // 因超时而登出，不需要调用后端 API
          // toast 会由下面的 useEffect 处理
          return;
        }
        
        if (result.restored) {
          // 用户信息已从 cookie 恢复，验证 token 是否仍然有效
          const meRes = await fetch('/api/auth/me', {
            credentials: 'include',
          });
          
          if (!meRes.ok) {
            // Token 无效，清除用户信息
            logout();
          }
        } else {
          // Cookie 中没有用户信息，尝试从后端获取
          const meRes = await fetch('/api/auth/me', {
            credentials: 'include',
          });

          if (meRes.ok) {
            const user = await meRes.json();
            restoreSession(user);
          }
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setInitialized(true);
      }
    };

    initAuth();
  }, [initialized, restoreFromCookie, restoreSession, setSessionTimeout, setInitialized, logout]);

  // 从后端加载用户的会话列表
  const loadUserSessions = useCallback(async () => {
    try {
      const response = await authFetch(API_URLS.SESSIONS);
      if (response.ok) {
        const backendSessions = await response.json();
        // 转换后端会话格式为前端格式
        const formattedSessions = backendSessions.map((s: any) => ({
          id: s.id,
          title: s.title || "新会话",
          preview: s.preview,
          messageCount: s.messageCount || s.message_count || 0,
          updatedAt: s.updatedAt || s.updated_at || new Date().toISOString(),
          messages: [], // 消息从后端按需加载
        }));
        setSessions(formattedSessions);
      }
    } catch (error) {
      console.error("Failed to load sessions from backend:", error);
    }
  }, [setSessions]);

  // 检查登录状态和超时
  useEffect(() => {
    // 未初始化完成时保持 loading 状态
    if (!initialized) {
      setView("loading");
      return;
    }

    if (isAuthenticated && currentUser) {
      // 初始化完成后，不立即检查超时，让用户可以正常使用
      // 超时检查由活动检测的 interval 负责
      setView("main");
      
      // 检查用户是否变化
      if (prevUserIdRef.current !== currentUser.id) {
        // 用户变化，清空旧数据并加载新用户数据
        clearAllSessions();
        loadUserSessions();
        prevUserIdRef.current = currentUser.id;
      }
    } else {
      setView("login");
      // 清空会话数据
      if (prevUserIdRef.current) {
        clearAllSessions();
        prevUserIdRef.current = null;
      }
    }
  }, [initialized, isAuthenticated, currentUser, toast, clearAllSessions, loadUserSessions]);

  // 处理超时提示
  useEffect(() => {
    if (timedOut && initialized && !isAuthenticated) {
      toast({
        description: "由于长时间未操作，已自动退出登录",
        variant: "destructive",
      });
      clearTimedOut();
    }
  }, [timedOut, initialized, isAuthenticated, toast, clearTimedOut]);

  // 活动检测 - 更新最后活动时间
  useEffect(() => {
    if (view !== "main") return;

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handleActivity = () => updateActivity();

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // 定期检查超时
    const interval = setInterval(() => {
      const isTimeout = checkTimeout();
      if (isTimeout) {
        setView("login");
        toast({
          description: "由于长时间未操作，已自动退出登录",
          variant: "destructive",
        });
      }
    }, 60000); // 每分钟检查一次

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [view, updateActivity, checkTimeout, toast]);

  // 折叠状态管理
  const {
    collapsedSections,
    autoCollapseEnabled,
    toggleAutoCollapse,
    toggleSection,
    autoCollapseForContent,
    expandSection,
  } = useSectionCollapse(sessionId);

  // 步骤导航状态
  const [activeSection, setActiveSection] = useState<string>("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 预览管理
  const {
    isPreviewOpen,
    previewTitle,
    previewContent,
    previewType,
    previewLoading,
    previewScrollRef,
    openPreview,
    closePreview,
    downloadFileByUrl,
  } = usePreview();

  // 工作区管理
  const {
    workspaceFiles,
    workspaceTree,
    expanded,
    setExpanded,
    isUploading,
    uploadMsg,
    dropActive,
    setDropActive,
    treeContainerRef,
    treeSize,
    loadWorkspaceFiles,
    loadWorkspaceTree,
    deleteFile,
    deleteDir,
    moveToDir,
    uploadToDir,
    clearWorkspace,
    toArbor,
  } = useWorkspace(sessionId);

  // 代码编辑器管理
  const {
    editorHeight,
    codeEditorContent,
    setCodeEditorContent,
    showCodeEditor,
    isExecutingCode,
    codeExecutionResult,
    handleMouseDown,
    executeCode,
    openCodeEditor,
    closeCodeEditor,
  } = useCodeEditor(sessionId);

  // 聊天管理
  const {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isTyping,
    streamingMessageId,
    messagesEndRef,
    clearChat,
    handleSendMessage,
    stopGeneration,
    scrollToBottom,
    loadSessionMessages,
  } = useChat(
    sessionId,
    loadWorkspaceFiles,
    loadWorkspaceTree,
    autoCollapseForContent
  );

  // 创建新会话
  const handleNewSession = useCallback(async () => {
    if (isTyping) {
      toast({ description: "请等待当前响应完成", variant: "destructive" });
      return;
    }

    // 检查当前会话是否有用户聊天记录
    const hasUserMessages = messages.some(m => m.sender === "user" && !m.localOnly);
    if (!hasUserMessages && messages.length === 0) {
      toast({ description: "当前会话无聊天记录，无需新建会话" });
      return;
    }

    // 创建新会话（在内存中）
    const newSessionId = createNewSession();
    clearChat();

    // 立即保存到后端
    try {
      await authFetch(API_URLS.SESSIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newSessionId,
          title: "新会话",
        }),
      });
    } catch (error) {
      console.error("Failed to create session in backend:", error);
    }

    toast({ description: "已创建新会话" });
  }, [
    isTyping,
    messages,
    createNewSession,
    clearChat,
    toast,
  ]);

  // 选择历史会话 - 从后端加载消息
  const handleSelectSession = useCallback(
    async (id: string) => {
      if (isTyping) {
        toast({ description: "请等待当前响应完成", variant: "destructive" });
        return;
      }

      // 切换到选择的会话
      setCurrentSession(id);

      // 从后端加载会话消息
      try {
        const response = await authFetch(API_URLS.SESSION_MESSAGES(id));
        if (response.ok) {
          const backendMessages = await response.json();
          const restored: Message[] = backendMessages.map((m: any) => ({
            id: m.id,
            content: m.content,
            sender: m.role === "user" ? "user" : "ai",
            timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
          }));
          loadSessionMessages(restored);
        } else {
          clearChat();
        }
      } catch (error) {
        console.error("Failed to load session messages:", error);
        clearChat();
      }

      toast({ description: "已切换到历史会话" });
    },
    [
      isTyping,
      setCurrentSession,
      loadSessionMessages,
      clearChat,
      toast,
    ]
  );

  // 删除历史会话
  const handleDeleteSession = useCallback(
    async (id: string) => {
      try {
        // 调用后端 API 删除会话
        const response = await authFetch(`${API_URLS.SESSIONS}/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to delete session from backend:", errorData);
          toast({ description: "删除失败", variant: "destructive" });
          return;
        }

        // 从内存中删除会话
        deleteSession(id);
        // 如果删除的是当前会话，创建新会话
        if (id === currentSessionId) {
          createNewSession();
          clearChat();
        }
        toast({ description: "已删除会话" });
      } catch (error) {
        console.error("Delete session error:", error);
        toast({ description: "删除失败", variant: "destructive" });
      }
    },
    [deleteSession, currentSessionId, createNewSession, clearChat, toast]
  );

  // 导出 PDF 报告
  const exportReportPDF = useCallback(async () => {
    try {
      const payloadMessages = messages
        .filter((m) => !m.localOnly)
        .map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content,
        }));

      if (payloadMessages.length === 0) {
        toast({ description: "没有可导出的消息", variant: "destructive" });
        return;
      }

      toast({ description: "正在生成 PDF 报告..." });

      const res = await authFetch(API_URLS.EXPORT_REPORT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          session_id: sessionId,
          format: "pdf",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Export error:", errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log("Export response:", data);

      const pdfUrl = data?.download_urls?.pdf;
      const pdfName = data?.pdf || `report_${Date.now()}.pdf`;

      if (pdfUrl) {
        // 使用代理 API 下载文件，确保携带认证信息
        try {
          // 构建代理 URL
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(pdfUrl)}`;
          const pdfRes = await authFetch(proxyUrl);
          
          if (!pdfRes.ok) throw new Error(`PDF fetch failed: ${pdfRes.status}`);
          
          const blob = await pdfRes.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          // 创建下载链接
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = pdfName;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          
          // 清理
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
            document.body.removeChild(link);
          }, 100);
          
          const message = data.message === "cached" 
            ? `报告已存在，直接下载: ${pdfName}` 
            : `已生成并下载: ${pdfName}`;
          toast({ description: message });
        } catch (downloadErr) {
          console.error("Download error:", downloadErr);
          toast({ 
            description: `报告已生成到 workspace/generated 目录，请从文件列表下载`,
            variant: "default" 
          });
        }
      } else {
        // PDF 生成失败，显示错误
        const errorMsg = data?.error || "PDF 生成失败";
        console.error("PDF generation failed:", errorMsg);
        toast({ description: errorMsg, variant: "destructive" });
      }

      await loadWorkspaceFiles();
      await loadWorkspaceTree();
    } catch (e) {
      console.error("Export error:", e);
      toast({ description: `导出失败: ${e instanceof Error ? e.message : "未知错误"}`, variant: "destructive" });
    }
  }, [messages, sessionId, loadWorkspaceFiles, loadWorkspaceTree, toast]);

  // 消息渲染器
  const messageRenderer = useMessageRenderer({
    isDarkMode,
    collapsedSections,
    isTyping,
    onToggleSection: toggleSection,
    onEditCode: openCodeEditor,
    onExportReport: exportReportPDF,
    toast,
  });

  // 右键菜单状态
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null);
  const [contextTarget, setContextTarget] = useState<WorkspaceNode | null>(null);
  const [deleteConfirmPath, setDeleteConfirmPath] = useState<string | null>(null);
  const [deleteIsDir, setDeleteIsDir] = useState<boolean>(false);

  // 打开节点预览
  const openNode = useCallback(async (node: WorkspaceNode | ArborNode) => {
    if ("is_dir" in node && node.is_dir) return;
    if ("isDir" in node && node.isDir) return;

    const ext = (
      "extension" in node ? node.extension : node.extension || ""
    ).replace(/^\./, "").toLowerCase();
    const correctedUrl = ensureGeneratedInUrl(node.download_url || "");

    const mapped: WorkspaceFile = {
      name: node.name,
      size: node.size || 0,
      extension: ext,
      icon: "icon" in node ? node.icon || "" : "",
      download_url: correctedUrl,
      preview_url: correctedUrl,
    };
    openPreview(mapped);
  }, [openPreview]);

  // 右键菜单处理
  const onContextMenu = useCallback(
    (e: React.MouseEvent, node: WorkspaceNode | ArborNode) => {
      e.preventDefault();
      const wsNode: WorkspaceNode =
        "isDir" in node
          ? {
              name: node.name,
              path: node.id,
              is_dir: node.isDir,
              download_url: node.download_url,
              extension: node.extension,
              size: node.size,
              is_generated: node.isGenerated,
            }
          : node;
      setContextTarget(wsNode);
      setContextPos({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const closeContext = useCallback(() => {
    setContextPos(null);
    setContextTarget(null);
  }, []);

  // 删除确认处理
  const onDeleteConfirm = useCallback(
    (path: string, isDir: boolean) => {
      setDeleteConfirmPath(path);
      setDeleteIsDir(isDir);
      closeContext();
    },
    [closeContext]
  );

  // 执行删除
  const executeDelete = useCallback(async () => {
    if (deleteConfirmPath) {
      if (deleteIsDir) {
        await deleteDir(deleteConfirmPath);
      } else {
        await deleteFile(deleteConfirmPath);
      }
    }
    setDeleteConfirmPath(null);
  }, [deleteConfirmPath, deleteIsDir, deleteDir, deleteFile]);

  // 滚动到指定 section
  const scrollToSection = useCallback(
    (sectionKey: string) => {
      const container = messagesContainerRef.current;
      if (!container) return;

      expandSection(sectionKey);

      setTimeout(() => {
        const element = document.querySelector(
          `[data-section-key="${sectionKey}"]`
        );

        if (!element) return;

        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scrollTop = container.scrollTop;

        const targetScroll =
          scrollTop +
          elementRect.top -
          containerRect.top -
          containerRect.height / 2 +
          elementRect.height / 2;

        container.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: "smooth",
        });

        setActiveSection(sectionKey);
      }, 150);
    },
    [expandSection]
  );

  // 监听滚动更新 activeSection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const updateActiveSectionFromScroll = () => {
      const sections = document.querySelectorAll("[data-section-key]");
      const containerRect = container.getBoundingClientRect();
      const containerMiddle = containerRect.top + containerRect.height / 2;

      let closestSection = "";
      let closestDistance = Infinity;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const sectionMiddle = rect.top + rect.height / 2;
        const distance = Math.abs(sectionMiddle - containerMiddle);

        if (
          distance < closestDistance &&
          rect.top < containerRect.bottom &&
          rect.bottom > containerRect.top
        ) {
          closestDistance = distance;
          closestSection = section.getAttribute("data-section-key") || "";
        }
      });

      if (closestSection) {
        setActiveSection(closestSection);
      }
    };

    const onScroll = () => {
      updateActiveSectionFromScroll();
    };

    onScroll();
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // 获取最后一条 AI 消息的步骤
  const getLastAiMessageSections = useCallback(() => {
    let lastAiMsgIndex = -1;
    let lastAiMsg = null;

    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "ai") {
        lastAiMsg = messages[i];
        lastAiMsgIndex = i;
        break;
      }
    }

    if (!lastAiMsg || lastAiMsgIndex === -1) return [];

    return messageRenderer.extractSections(lastAiMsg.content, lastAiMsgIndex);
  }, [messages, messageRenderer]);

  const stepSections = getLastAiMessageSections();

  // 用户头像组件
  const userAvatarElement = (
    <UserAvatar onOpenAdmin={() => setView("admin")} />
  );

  // 加载中页面
  if (view === "loading") {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  // 登录页面
  if (view === "login") {
    return (
      <LoginPage
        onLoginSuccess={() => setView("main")}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // 管理员页面
  if (view === "admin") {
    return (
      <AdminPage
        onBack={() => setView("main")}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // 主界面
  return (
    <>
      <div
        className="h-screen bg-white dark:bg-black text-black dark:text-white"
        suppressHydrationWarning
      >
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Workspace Tree & History */}
          <ResizablePanel defaultSize={25} minSize={15}>
            <LeftPanel
              treeContainerRef={treeContainerRef}
              treeSize={treeSize}
              workspaceTree={workspaceTree}
              toArbor={toArbor}
              dropActive={dropActive}
              setDropActive={setDropActive}
              uploadMsg={uploadMsg}
              onDeleteGeneratedFolder={(path) => onDeleteConfirm(path, true)}
              onDeleteFile={(path, isDir) => onDeleteConfirm(path, isDir)}
              onOpenNode={openNode}
              onDownloadFile={downloadFileByUrl}
              onContextMenu={onContextMenu}
              onUploadToDir={uploadToDir}
              onClearWorkspace={clearWorkspace}
              onFileUpload={(files) => uploadToDir("", files)}
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSelectSession={handleSelectSession}
              onDeleteSession={handleDeleteSession}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Middle Panel - Chat & Analysis */}
          <ResizablePanel defaultSize={40} minSize={25}>
            <MiddlePanel
              messages={messages}
              streamingMessageId={streamingMessageId}
              isTyping={isTyping}
              inputValue={inputValue}
              mounted={mounted}
              isDarkMode={isDarkMode}
              autoCollapseEnabled={autoCollapseEnabled}
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
              renderAssistant={messageRenderer.renderMessageWithSections}
              renderAssistantStreaming={
                messageRenderer.renderMessageWithSectionsStreaming
              }
              stepNavigator={
                <StepNavigator
                  sections={stepSections}
                  activeSection={activeSection}
                  onScrollToSection={scrollToSection}
                />
              }
              userAvatar={userAvatarElement}
              onInputChange={setInputValue}
              onSendMessage={handleSendMessage}
              onStopGeneration={stopGeneration}
              onToggleTheme={toggleTheme}
              onToggleAutoCollapse={toggleAutoCollapse}
              onClearChat={clearChat}
              onNewSession={handleNewSession}
              onFileUpload={(files) => uploadToDir("", files)}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Code Editor */}
          <ResizablePanel defaultSize={35} minSize={20}>
            <RightPanel
              showCodeEditor={showCodeEditor}
              editorHeight={editorHeight}
              codeEditorContent={codeEditorContent}
              isExecutingCode={isExecutingCode}
              codeExecutionResult={codeExecutionResult}
              isDarkMode={isDarkMode}
              onCodeChange={setCodeEditorContent}
              onMouseDown={handleMouseDown}
              onExecuteCode={executeCode}
              onClose={closeCodeEditor}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* 右键菜单 */}
      <ContextMenu
        contextPos={contextPos}
        contextTarget={contextTarget}
        onClose={closeContext}
        onOpenNode={openNode}
        onMoveToDir={moveToDir}
        onDeleteConfirm={onDeleteConfirm}
        onDownloadFile={downloadFileByUrl}
      />

      {/* 全局删除确认弹窗 */}
      <AlertDialog
        open={!!deleteConfirmPath}
        onOpenChange={(o) => !o && setDeleteConfirmPath(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteIsDir ? "确认删除文件夹？" : "确认删除文件？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteIsDir
                ? "此操作不可撤销，将删除该文件夹及其所有内容。"
                : "此操作不可撤销，将从 workspace 中移除此文件。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmPath(null)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={executeDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
