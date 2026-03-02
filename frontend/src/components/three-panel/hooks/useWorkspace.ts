"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { API_URLS, authFetch } from "@/lib/config";
import { WorkspaceFile, WorkspaceNode, ArborNode } from "../types";

/**
 * 工作区管理 Hook
 */
export function useWorkspace(sessionId: string) {
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceNode | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string>("");
  const [dropActive, setDropActive] = useState(false);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const [treeSize, setTreeSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  // 加载工作区文件列表
  const loadWorkspaceFiles = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await authFetch(
        `${API_URLS.WORKSPACE_FILES}?session_id=${sessionId}`
      );
      if (response.ok) {
        const data = await response.json();
        setWorkspaceFiles(data.files);
      }
    } catch (error) {
      console.error("Failed to load workspace files:", error);
    }
  }, [sessionId]);

  // 加载工作区树
  const loadWorkspaceTree = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await authFetch(
        `${API_URLS.WORKSPACE_TREE}?session_id=${sessionId}`
      );
      if (res.ok) {
        const data = await res.json();
        // 标记 generated 文件夹及其内容
        const markGenerated = (
          node: WorkspaceNode,
          parentIsGenerated = false
        ) => {
          const isGenerated =
            parentIsGenerated ||
            node.name === "generated" ||
            node.path.startsWith("generated/") ||
            node.path.startsWith("generated");
          node.is_generated = isGenerated;
          if (node.children) {
            node.children.forEach((child) => markGenerated(child, isGenerated));
          }
        };
        if (data) {
          markGenerated(data);
        }
        setWorkspaceTree(data);
        // 默认展开根与第一层，包括 generated 文件夹
        const init: Record<string, boolean> = { "": true };
        if (data?.children) {
          data.children.forEach((c: WorkspaceNode) => {
            if (c.is_dir) init[c.path] = true;
          });
        }
        setExpanded(init);
      }
    } catch (e) {
      console.error("load tree error", e);
    }
  }, [sessionId]);

  // 切换展开状态
  const toggleExpand = useCallback((p: string) => {
    setExpanded((prev) => ({ ...prev, [p]: !prev[p] }));
  }, []);

  // 删除文件
  const deleteFile = useCallback(async (p: string) => {
    try {
      const url = `${API_URLS.WORKSPACE_DELETE_FILE}?path=${encodeURIComponent(
        p
      )}&session_id=${encodeURIComponent(sessionId)}`;
      const res = await authFetch(url, { method: "DELETE" });
      if (res.ok) {
        await loadWorkspaceTree();
        await loadWorkspaceFiles();
      }
    } catch (e) {
      console.error("delete file error", e);
    }
  }, [sessionId, loadWorkspaceTree, loadWorkspaceFiles]);

  // 删除目录
  const deleteDir = useCallback(async (p: string) => {
    try {
      const url = `${API_URLS.WORKSPACE_DELETE_DIR}?path=${encodeURIComponent(
        p
      )}&recursive=true&session_id=${encodeURIComponent(sessionId)}`;
      const res = await authFetch(url, { method: "DELETE" });
      if (res.ok) {
        await loadWorkspaceTree();
        await loadWorkspaceFiles();
      }
    } catch (e) {
      console.error("delete dir error", e);
    }
  }, [sessionId, loadWorkspaceTree, loadWorkspaceFiles]);

  // 移动文件/文件夹
  const moveToDir = useCallback(async (srcPath: string, dstDir: string) => {
    try {
      const url = `${API_URLS.WORKSPACE_MOVE}?src=${encodeURIComponent(
        srcPath
      )}&dst_dir=${encodeURIComponent(dstDir)}&session_id=${encodeURIComponent(
        sessionId
      )}`;
      const res = await authFetch(url, { method: "POST" });
      if (res.ok) {
        await loadWorkspaceTree();
        await loadWorkspaceFiles();
      }
    } catch (e) {
      console.error("move to dir error", e);
    }
  }, [sessionId, loadWorkspaceTree, loadWorkspaceFiles]);

  // 上传文件到指定目录
  const uploadToDir = useCallback(async (dirPath: string, files: FileList | File[]) => {
    // 验证 sessionId
    if (!sessionId) {
      setUploadMsg("上传失败：会话未初始化");
      setTimeout(() => setUploadMsg(""), 3000);
      return;
    }
    
    // 验证文件
    const arr: File[] = Array.from(files as File[]);
    if (arr.length === 0) {
      setUploadMsg("请选择要上传的文件");
      setTimeout(() => setUploadMsg(""), 2000);
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadMsg(`正在上传 ${arr.length} 个文件...`);
      
      const form = new FormData();
      arr.forEach((f) => form.append("files", f));
      
      // 使用正确的 upload-to 接口
      const url = `${API_URLS.WORKSPACE_UPLOAD_TO}?dir=${encodeURIComponent(
        dirPath || ""
      )}&session_id=${encodeURIComponent(sessionId)}`;
      
      console.log("[Upload] Starting upload to:", url);
      
      const response = await authFetch(url, { method: "POST", body: form });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Upload] Server error:", response.status, errorText);
        throw new Error(`上传失败: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log("[Upload] Success:", result);
      
      await loadWorkspaceTree();
      await loadWorkspaceFiles();
      setUploadMsg(`上传成功 ${arr.length} 个文件`);
      setTimeout(() => setUploadMsg(""), 2000);
    } catch (e) {
      console.error("[Upload] Error:", e);
      setUploadMsg(`上传失败: ${e instanceof Error ? e.message : "未知错误"}`);
      setTimeout(() => setUploadMsg(""), 3000);
    }
    setIsUploading(false);
  }, [sessionId, loadWorkspaceTree, loadWorkspaceFiles]);

  // 清空工作区
  const clearWorkspace = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await authFetch(
        `${API_URLS.WORKSPACE_CLEAR}?session_id=${sessionId}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        setWorkspaceFiles([]);
        await loadWorkspaceTree();
        await loadWorkspaceFiles();
      }
    } catch (error) {
      console.error("Failed to clear workspace:", error);
    }
  }, [sessionId, loadWorkspaceTree, loadWorkspaceFiles]);

  // 将后端树转换为 Arborist 数据（递归函数）
  const toArbor = useCallback(function toArbor(node: WorkspaceNode): ArborNode {
    return {
      id: node.path || "",
      name: node.name || "workspace",
      isDir: node.is_dir,
      icon: node.icon,
      download_url: node.download_url,
      extension: node.extension,
      size: node.size,
      isGenerated: node.is_generated,
      children: node.children?.map(toArbor),
    };
  }, []);

  // 初始化加载
  useEffect(() => {
    if (sessionId) {
      loadWorkspaceFiles();
      loadWorkspaceTree();
    }
  }, [sessionId, loadWorkspaceFiles, loadWorkspaceTree]);

  // 智能轮询
  useEffect(() => {
    const id = setInterval(() => {
      const isVisible =
        typeof document !== "undefined" && document.visibilityState === "visible";
      if (!isUploading && isVisible) {
        loadWorkspaceTree();
        loadWorkspaceFiles();
      }
    }, 4000);
    return () => clearInterval(id);
  }, [isUploading, loadWorkspaceTree, loadWorkspaceFiles]);

  // 树容器尺寸监听
  useEffect(() => {
    const el = treeContainerRef.current;
    if (!el) return;
    const ro = new (window as any).ResizeObserver((entries: any) => {
      for (const entry of entries) {
        const cr = entry.contentRect as DOMRectReadOnly;
        setTreeSize({
          w: Math.max(0, Math.floor(cr.width)),
          h: Math.max(0, Math.floor(cr.height)),
        });
      }
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setTreeSize({
      w: Math.max(0, Math.floor(rect.width)),
      h: Math.max(0, Math.floor(rect.height)),
    });
    return () => ro.disconnect();
  }, []);

  return {
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
    toggleExpand,
    deleteFile,
    deleteDir,
    moveToDir,
    uploadToDir,
    clearWorkspace,
    toArbor,
  };
}
