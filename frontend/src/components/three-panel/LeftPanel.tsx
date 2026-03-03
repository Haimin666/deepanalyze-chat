"use client";

import { useRef, useState, useCallback } from "react";
import { Tree } from "react-arborist";
import { Button } from "@/components/ui/button";
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
import { Trash2, Upload } from "lucide-react";
import { WorkspaceTreeRow } from "./WorkspaceTreeRow";
import { HistoryPanel } from "./HistoryPanel";
import { WorkspaceNode, ArborNode } from "./types";
import type { ChatSession } from "@/lib/store";

type LeftPanelProps = {
  treeContainerRef: React.RefObject<HTMLDivElement>;
  treeSize: { w: number; h: number };
  workspaceTree: WorkspaceNode | null;
  toArbor: (node: WorkspaceNode) => ArborNode;
  dropActive: boolean;
  setDropActive: (active: boolean) => void;
  uploadMsg: string;
  onDeleteGeneratedFolder: (path: string) => void;
  onDeleteFile: (path: string, isDir: boolean) => void;
  onOpenNode: (node: ArborNode) => void;
  onDownloadFile: (name: string, url: string) => void;
  onContextMenu: (e: React.MouseEvent, node: ArborNode) => void;
  onUploadToDir: (dirPath: string, files: FileList | File[]) => void;
  onClearWorkspace: () => void;
  onFileUpload: (files: FileList) => void;
  // 历史会话相关
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
};

export function LeftPanel({
  treeContainerRef,
  treeSize,
  workspaceTree,
  toArbor,
  dropActive,
  setDropActive,
  uploadMsg,
  onDeleteGeneratedFolder,
  onDeleteFile,
  onOpenNode,
  onDownloadFile,
  onContextMenu,
  onUploadToDir,
  onClearWorkspace,
  onFileUpload,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
}: LeftPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const treeContentRef = useRef<HTMLDivElement>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // 处理清空工作区
  const handleClearWorkspace = useCallback(async () => {
    await onClearWorkspace();
    setClearDialogOpen(false);
  }, [onClearWorkspace]);

  // 历史会话固定高度
  const historyPanelHeight = 180;

  return (
    <div className="flex flex-col min-h-0 min-w-0 h-full">
      {/* 上半部分：文件树 - 自动填充剩余空间 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 h-12 shrink-0">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Files
          </h2>
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onFileUpload(e.target.files);
                  // 重置 input，允许重复上传同一文件
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                  title="清空 workspace"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>清空 workspace？</AlertDialogTitle>
                  <AlertDialogDescription>
                    将删除 workspace 根目录下的所有文件与文件夹，此操作不可撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleClearWorkspace}
                  >
                    确认清空
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div
          ref={treeContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pl-3 pr-1 py-2"
        >
          {/* 上传区域 */}
          <div
            className={`mb-2 rounded border border-dashed flex items-center justify-center h-16 text-xs select-none cursor-pointer transition-colors ${
              dropActive
                ? "bg-blue-50 border-blue-300 text-blue-600"
                : "bg-gray-50 dark:bg-gray-900/40 border-gray-300 dark:border-gray-700 text-gray-500"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDropActive(false);
              const files = e.dataTransfer.files;
              if (files && files.length) onUploadToDir("", files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex items-center gap-2">
              <Upload className="h-3 w-3" />
              <span>拖拽或点击上传</span>
            </div>
          </div>

          {uploadMsg && (
            <div className="px-2 pb-2 text-[11px] text-gray-500">
              {uploadMsg}
            </div>
          )}

          {/* 文件树 */}
          {workspaceTree ? (
            <div ref={treeContentRef}>
              <Tree
                width={treeSize.w || 300}
                height={treeSize.h ? treeSize.h - historyPanelHeight - 120 : 200}
                data={toArbor(workspaceTree).children || []}
                openByDefault
                indent={14}
                rowHeight={28}
              >
                {(props) => (
                  <WorkspaceTreeRow
                    {...props}
                    onDeleteGeneratedFolder={onDeleteGeneratedFolder}
                    onDeleteFile={onDeleteFile}
                    onOpenNode={onOpenNode}
                    onDownloadFile={onDownloadFile}
                    onContextMenu={onContextMenu}
                    onUploadToDir={onUploadToDir}
                  />
                )}
              </Tree>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">
              Loading...
            </div>
          )}
        </div>
      </div>

      {/* 下半部分：历史会话 - 固定高度 */}
      <div
        style={{ height: historyPanelHeight }}
        className="shrink-0 flex flex-col overflow-hidden border-t border-gray-200 dark:border-gray-800"
      >
        <HistoryPanel
          sessions={sessions}
          currentSessionId={currentSessionId || ""}
          onSelectSession={onSelectSession}
          onDeleteSession={onDeleteSession}
        />
      </div>
    </div>
  );
}
