"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ChatSession } from "@/lib/store";

type HistoryPanelProps = {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
};

export function HistoryPanel({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
}: HistoryPanelProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return "今天 " + date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "昨天 " + date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const handleDelete = (sessionId: string) => {
    onDeleteSession(sessionId);
    setDeleteDialogOpen(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 h-12 shrink-0">
        <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          历史会话
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {sessions.length} 个会话
        </span>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-600">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs">暂无历史会话</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-lg p-3 pr-10 cursor-pointer transition-colors ${
                  currentSessionId === session.id
                    ? "bg-gray-100 dark:bg-gray-800"
                    : "hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-start gap-2 w-full min-w-0">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {session.title || "新会话"}
                    </p>
                    {session.preview && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
                        {session.preview}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(session.updatedAt)}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        · {session.messageCount || 0} 条消息
                      </span>
                    </div>
                  </div>
                </div>

                {/* 删除按钮 - 绝对定位，鼠标悬停时显示 */}
                <div
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AlertDialog open={deleteDialogOpen === session.id} onOpenChange={(open) => {
                    if (!open) setDeleteDialogOpen(null);
                  }}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialogOpen(session.id);
                        }}
                        title="删除会话"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>删除会话？</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除会话 "{session.title || "新会话"}" 吗？此操作不可撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>取消</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(session.id);
                          }}
                        >
                          确认删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
