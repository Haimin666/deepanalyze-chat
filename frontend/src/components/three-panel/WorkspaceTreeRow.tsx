"use client";

import type React from "react";
import { NodeApi } from "react-arborist";
import { FileIcon, defaultStyles } from "react-file-icon";
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
import { FolderOpen, Code2, Sparkles, X, Trash2 } from "lucide-react";
import { ArborNode } from "./types";
import { getExt, formatFileSize } from "./utils";
import { useState } from "react";

export type WorkspaceTreeRowProps = {
  node: NodeApi<ArborNode>;
  style: React.CSSProperties;
  dragHandle?: (el: HTMLDivElement | null) => void;
  onDeleteGeneratedFolder: (path: string) => void;
  onDeleteFile?: (path: string, isDir: boolean) => void;
  onOpenNode: (node: ArborNode) => void;
  onDownloadFile: (name: string, url: string) => void;
  onContextMenu: (e: React.MouseEvent, node: ArborNode) => void;
  onUploadToDir: (dirPath: string, files: FileList | File[]) => void;
};

export const WorkspaceTreeRow = ({
  node,
  style,
  dragHandle,
  onDeleteGeneratedFolder,
  onDeleteFile,
  onOpenNode,
  onDownloadFile,
  onContextMenu,
  onUploadToDir,
}: WorkspaceTreeRowProps) => {
  const data = node.data;
  const isDir = data.isDir;
  const isGenerated = data.isGenerated || false;
  const isGeneratedFolder = isDir && data.name === "generated";
  const ext = getExt(data.name, data.extension);

  // 处理删除按钮点击
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDeleteFile) {
      onDeleteFile(data.id, isDir);
    }
  };

  return (
    <div style={style}>
      {/* Generated 分组标题 + 删除按钮 */}
      {isGeneratedFolder && (
        <div className="mt-2 mb-1 px-2 flex items-center justify-between select-none">
          <div className="flex items-center gap-2 text-[11px] text-purple-600 dark:text-purple-400">
            <span className="h-px w-4 bg-purple-200 dark:bg-purple-800" />
            <span className="font-medium">代码生成文件</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
                aria-label="删除生成文件夹"
                title="删除生成文件夹"
                onClick={(e) => e.stopPropagation()}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>删除 generated 文件夹？</AlertDialogTitle>
                <AlertDialogDescription>
                  将删除所有 AI 生成的文件，此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => onDeleteGeneratedFolder(data.id)}
                >
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div
        className={`group flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900 rounded px-2 py-1 cursor-pointer ${
          isGenerated ? "bg-purple-50 dark:bg-purple-950/20" : ""
        }`}
        onClick={(e) => {
          if (isDir) {
            node.toggle();
            return;
          }
          onOpenNode(data);
        }}
        onDoubleClick={(e) => {
          if (isDir) return;
          e.stopPropagation();
          if (data.download_url) {
            onDownloadFile(data.name, data.download_url);
          }
        }}
        onContextMenu={(e) => onContextMenu(e as any, data)}
        onDragOver={(e) => {
          if (isDir) {
            e.preventDefault();
            e.dataTransfer.dropEffect = (e.dataTransfer.types || []).includes(
              "text/x-workspace-path"
            )
              ? "move"
              : "copy";
          }
        }}
        onDrop={(e) => {
          if (!isDir) return;
          e.preventDefault();
          onUploadToDir(data.id, e.dataTransfer.files || []);
        }}
      >
        <div
          className="flex items-center gap-2 text-sm flex-1 min-w-0"
          ref={dragHandle}
          draggable={!isDir}
          onDragStart={(e) => {
            if (isDir) return;
            e.dataTransfer.setData("text/x-workspace-path", data.id);
            e.dataTransfer.effectAllowed = "move";
          }}
        >
          {isDir ? (
            <>
              <span
                className={
                  isGenerated
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-gray-500"
                }
              >
                {node.isOpen ? "▾" : "▸"}
              </span>
              {isGenerated ? (
                <Code2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              ) : (
                <FolderOpen className="h-3.5 w-3.5 text-gray-500" />
              )}
            </>
          ) : (
            <div style={{ width: 16, height: 16 }}>
              {/* @ts-ignore */}
              <FileIcon
                extension={ext}
                {...((defaultStyles as any)[ext] || (defaultStyles as any).txt)}
              />
            </div>
          )}
          <span
            className={`truncate ${
              isGenerated ? "text-purple-700 dark:text-purple-300 font-medium" : ""
            }`}
          >
            {data.name}
          </span>
          {typeof data.size === "number" && !isDir && (
            <span className="text-[10px] text-gray-400 ml-2 shrink-0">
              {formatFileSize(data.size)}
            </span>
          )}
          {isGenerated && !isDir && (
            <Sparkles className="h-3 w-3 text-purple-500 ml-1 shrink-0" />
          )}
        </div>

        {/* 悬浮删除按钮 - 非根目录文件/文件夹 */}
        {onDeleteFile && !isGeneratedFolder && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
                onClick={(e) => e.stopPropagation()}
                title={isDir ? "删除文件夹" : "删除文件"}
              >
                <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isDir ? "删除文件夹？" : "删除文件？"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isDir
                    ? `确定要删除文件夹 "${data.name}" 及其所有内容吗？此操作不可撤销。`
                    : `确定要删除文件 "${data.name}" 吗？此操作不可撤销。`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteClick}
                >
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};
