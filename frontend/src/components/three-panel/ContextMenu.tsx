"use client";

import { WorkspaceNode } from "./types";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "./utils";

type ContextMenuProps = {
  contextPos: { x: number; y: number } | null;
  contextTarget: WorkspaceNode | null;
  onClose: () => void;
  onOpenNode: (node: WorkspaceNode) => void;
  onMoveToDir: (srcPath: string, dstDir: string) => void;
  onDeleteConfirm: (path: string, isDir: boolean) => void;
  onDownloadFile: (name: string, url: string) => void;
};

export function ContextMenu({
  contextPos,
  contextTarget,
  onClose,
  onOpenNode,
  onMoveToDir,
  onDeleteConfirm,
  onDownloadFile,
}: ContextMenuProps) {
  const { toast } = useToast();

  if (!contextPos || !contextTarget) return null;

  // 处理下载
  const handleDownload = () => {
    if (contextTarget.download_url) {
      onDownloadFile(contextTarget.name, contextTarget.download_url);
      onClose();
    }
  };

  return (
    <div
      className="fixed z-50 bg-card border border-gray-200 dark:border-gray-700 rounded shadow-sm text-sm"
      style={{ left: contextPos.x, top: contextPos.y, minWidth: 180 }}
      onMouseLeave={onClose}
    >
      {/* 生成文件专属：移动到普通文件区 */}
      {!contextTarget.is_dir &&
        contextTarget.path.startsWith("generated/") && (
          <button
            className="block w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={async () => {
              await onMoveToDir(contextTarget.path, "");
              onClose();
            }}
          >
            移动到普通文件区
          </button>
        )}
      {!contextTarget.is_dir && (
        <button
          className="block w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={() => {
            onOpenNode(contextTarget);
            onClose();
          }}
        >
          预览
        </button>
      )}
      {!contextTarget.is_dir && contextTarget.download_url && (
        <button
          className="block w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={handleDownload}
        >
          下载
        </button>
      )}
      <button
        className="block w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => {
          copyToClipboard(contextTarget.path)
            .then((ok) =>
              toast({
                description: ok ? "已复制路径" : "复制失败",
                variant: ok ? undefined : "destructive",
              })
            )
            .catch(() =>
              toast({ description: "复制失败", variant: "destructive" })
            );
          onClose();
        }}
      >
        复制路径
      </button>
      {!contextTarget.is_dir && (
        <button
          className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          onClick={() => {
            onDeleteConfirm(contextTarget.path, false);
          }}
        >
          删除文件
        </button>
      )}
      {contextTarget.is_dir && contextTarget.name === "generated" && (
        <button
          className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          onClick={() => {
            onDeleteConfirm(contextTarget.path, true);
          }}
        >
          删除文件夹
        </button>
      )}
    </div>
  );
}
