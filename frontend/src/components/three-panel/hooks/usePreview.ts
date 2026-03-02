"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { API_CONFIG } from "@/lib/config";
import { WorkspaceFile, PreviewType } from "../types";
import { normalizeToLocalFileUrl, ensureGeneratedInUrl } from "../url-utils";

/**
 * 预览管理 Hook
 */
export function usePreview() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewType, setPreviewType] = useState<PreviewType>("text");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDownloadUrl, setPreviewDownloadUrl] = useState<string>("");
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // 打开预览
  const openPreview = useCallback(async (file: WorkspaceFile) => {
    setPreviewTitle(file.name);
    setPreviewDownloadUrl(file.download_url);
    setIsPreviewOpen(true);
    setPreviewLoading(true);

    const ext = (file.extension || "").toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
      setPreviewType("image");
      const correctedUrl = ensureGeneratedInUrl(
        file.preview_url || file.download_url
      );
      setPreviewContent(correctedUrl);
      setPreviewLoading(false);
      return;
    }
    if (ext === "pdf") {
      setPreviewType("pdf");
      const correctedUrl = ensureGeneratedInUrl(
        file.preview_url || file.download_url
      );
      setPreviewContent(correctedUrl);
      setPreviewLoading(false);
      return;
    }

    try {
      const normalized = normalizeToLocalFileUrl(
        file.preview_url || file.download_url
      );
      const target = ensureGeneratedInUrl(normalized);
      const res = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/proxy?url=${encodeURIComponent(target)}`
      );
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) throw new Error("failed to fetch preview");
      if (
        contentType.startsWith("text/") ||
        contentType.includes("json") ||
        contentType.includes("xml")
      ) {
        const text = await res.text();
        setPreviewType("text");
        setPreviewContent(text);
      } else {
        setPreviewType("binary");
        setPreviewContent(file.download_url);
      }
    } catch (e) {
      setPreviewType("binary");
      setPreviewContent(file.download_url);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // 关闭预览
  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewTitle("");
    setPreviewContent("");
    setPreviewDownloadUrl("");
  }, []);

  // 处理下载
  const handleDownload = useCallback(async () => {
    try {
      if (previewType === "text" && typeof previewContent === "string") {
        const blob = new Blob([previewContent], {
          type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = previewTitle || "file.txt";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      const normalized = normalizeToLocalFileUrl(
        previewDownloadUrl || previewContent
      );
      const target = ensureGeneratedInUrl(normalized);
      const res = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/proxy?url=${encodeURIComponent(target)}`
      );
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = previewTitle || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const url = ensureGeneratedInUrl(previewDownloadUrl || previewContent);
      window.open(url, "_blank");
    }
  }, [previewType, previewContent, previewDownloadUrl, previewTitle]);

  // 通过 URL 下载文件
  const downloadFileByUrl = useCallback(async (fileName: string, rawUrl: string) => {
    try {
      const normalized = normalizeToLocalFileUrl(rawUrl);
      const target = ensureGeneratedInUrl(normalized);
      const res = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/proxy?url=${encodeURIComponent(target)}`
      );
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const fallbackUrl = ensureGeneratedInUrl(rawUrl);
      window.open(fallbackUrl, "_blank");
    }
  }, []);

  // 预览打开后滚动到顶部
  useEffect(() => {
    if (isPreviewOpen && !previewLoading && previewScrollRef.current) {
      previewScrollRef.current.scrollTop = 0;
    }
  }, [isPreviewOpen, previewLoading, previewType, previewContent]);

  return {
    isPreviewOpen,
    previewTitle,
    previewContent,
    previewType,
    previewLoading,
    previewDownloadUrl,
    previewScrollRef,
    openPreview,
    closePreview,
    handleDownload,
    downloadFileByUrl,
  };
}
