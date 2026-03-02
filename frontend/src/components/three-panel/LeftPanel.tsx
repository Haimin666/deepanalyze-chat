"use client";

import { useRef, useState, useCallback, useEffect } from "react";
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
import { Trash2, Upload, GripHorizontal } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const treeContentRef = useRef<HTMLDivElement>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // 处理拖拽分割线
  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  }, []);

  useEffect(() => {
    if (!isDraggingSplit) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newRatio = (e.clientY - containerRect.top) / containerRect.height;
      const clampedRatio = Math.max(0.2, Math.min(0.8, newRatio));
      setSplitRatio(clampedRatio);
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSplit]);

  const topHeight = splitRatio * 100;
  const bottomHeight = (1 - splitRatio) * 100;

  // 计算文件树的实际可用高度
  const treeHeight = treeSize.h ? treeSize.h * splitRatio - 120 : 200;

  return (
    <div ref={containerRef} className="flex flex-col min-h-0 min-w-0 h-full">
      {/* 上半部分：文件树 */}
      <div style={{ height: `${topHeight}%` }} className="flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 h-12 shrink-0">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Files
          </h2>
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => e.target.files && onFileUpload(e.target.files)}
              className="hidden"
              accept="*"
            />
            <AlertDialog>
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
                    onClick={onClearWorkspace}
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
                height={treeHeight}
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

      {/* 可拖动分割线 */}
      <div
        className="h-1.5 flex items-center justify-center cursor-row-resize bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors group"
        onMouseDown={handleSplitMouseDown}
      >
        <GripHorizontal className="h-3 w-6 text-gray-400 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-500" />
      </div>

      {/* 下半部分：历史会话 */}
      <div style={{ height: `${bottomHeight}%` }} className="min-h-0">
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
