"use client";

import type React from "react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Send,
  Moon,
  Sun,
  Eraser,
  Paperclip,
  RefreshCw,
  PlusSquare,
} from "lucide-react";
import { Message } from "./types";
import { ChatMessageItem } from "./ChatMessageItem";

type MiddlePanelProps = {
  messages: Message[];
  streamingMessageId: string | null;
  isTyping: boolean;
  inputValue: string;
  mounted: boolean;
  isDarkMode: boolean;
  autoCollapseEnabled: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  renderAssistant: (content: string, messageIndex?: number) => React.ReactNode;
  renderAssistantStreaming: (content: string, messageIndex?: number) => React.ReactNode;
  stepNavigator: React.ReactNode;
  userAvatar: React.ReactNode;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onToggleTheme: () => void;
  onToggleAutoCollapse: (enabled: boolean) => void;
  onClearChat: () => void;
  onNewSession: () => void;
  onFileUpload: (files: FileList) => void;
};

export function MiddlePanel({
  messages,
  streamingMessageId,
  isTyping,
  inputValue,
  mounted,
  isDarkMode,
  autoCollapseEnabled,
  messagesContainerRef,
  messagesEndRef,
  renderAssistant,
  renderAssistantStreaming,
  stepNavigator,
  userAvatar,
  onInputChange,
  onSendMessage,
  onToggleTheme,
  onToggleAutoCollapse,
  onClearChat,
  onNewSession,
  onFileUpload,
}: MiddlePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col min-h-0 min-w-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 h-12 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium">Assistant</h1>
            {isTyping && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span>执行中…</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span>自动折叠</span>
            <Switch
              className="data-[state=unchecked]:bg-gray-200 data-[state=unchecked]:border data-[state=unchecked]:border-gray-300"
              checked={autoCollapseEnabled}
              onCheckedChange={(v: boolean) => {
                onToggleAutoCollapse(!!v);
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTheme}
            className="h-8 w-8 p-0"
          >
            {mounted ? (
              isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          {userAvatar}
        </div>
      </div>

      {/* Step Navigator */}
      {stepNavigator}

      {/* Chat Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={(e) => {
          const target = e.currentTarget;
          const isBottom =
            Math.abs(
              target.scrollHeight - target.scrollTop - target.clientHeight
            ) < 50;
          // stickToBottomRef.current = isBottom;
        }}
        className="flex-1 min-h-0 min-w-0 overflow-y-scroll overflow-x-hidden px-4 py-4 pr-5 space-y-6 scrollbar-auto"
      >
        {messages.map((message, msgIdx) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            messageIndex={msgIdx}
            isStreaming={
              message.sender === "ai" && message.id === streamingMessageId
            }
            renderAssistant={renderAssistant}
            renderAssistantStreaming={renderAssistantStreaming}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex gap-3 items-end">
          {/* 新建会话按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewSession}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="新建会话"
          >
            <PlusSquare className="h-4 w-4" />
          </Button>

          {/* 文件上传按钮 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onFileUpload(e.target.files);
                // 重置 input 以允许重复上传相同文件
                e.target.value = "";
              }
            }}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="上传文件"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Ask anything..."
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              className="border-gray-200 dark:border-gray-700 bg-white dark:bg-black rounded-lg"
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                title="清空聊天"
                className="h-9 px-2"
                disabled={isTyping}
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>清空聊天？</AlertDialogTitle>
                <AlertDialogDescription>
                  将删除当前会话内的所有消息，仅保留欢迎提示。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onClearChat}
                  className="bg-red-600 hover:bg-red-700"
                >
                  确认清空
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {isTyping ? (
            <Button
              size="sm"
              className="h-9 w-9 p-0 rounded-full bg-white text-black border border-blue-400/50 dark:bg-white dark:text-black"
              title="正在生成…"
              disabled
            >
              <RefreshCw className="h-4 w-4 animate-spin" />
            </Button>
          ) : (
            <Button
              onClick={onSendMessage}
              size="sm"
              disabled={!inputValue.trim()}
              className="bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
