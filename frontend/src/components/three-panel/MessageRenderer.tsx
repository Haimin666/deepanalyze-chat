"use client";

import type React from "react";
import { useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Copy, Download, Edit, ChevronDown, ChevronRight } from "lucide-react";
import { API_CONFIG } from "@/lib/config";
import { StructuredSectionType, SectionConfigsMap } from "./types";
import { CodeBlockView } from "./CodeBlockView";
import { StreamingMarkdownBlock, StreamingSectionBody } from "./StreamingComponents";
import { extractCode, copyToClipboard, parseGeneratedFiles } from "./utils";
import { normalizeToLocalFileUrl, ensureGeneratedInUrl } from "./url-utils";

// Section 配置
const sectionConfigs: SectionConfigsMap = {
  Analyze: {
    icon: "🔍",
    color: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  },
  Understand: {
    icon: "🧠",
    color: "bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800",
  },
  Code: {
    icon: "💻",
    color: "bg-gray-50 border-gray-200 dark:bg-gray-950/30 dark:border-gray-700",
  },
  Execute: {
    icon: "⚡",
    color: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
  },
  Answer: {
    icon: "✅",
    color: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
  },
  File: {
    icon: "📎",
    color: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800",
  },
};

type MessageRendererProps = {
  isDarkMode: boolean;
  collapsedSections: Record<string, boolean>;
  isTyping: boolean;
  onToggleSection: (sectionKey: string, baseKey: string) => void;
  onEditCode: (code: string) => void;
  onExportReport: () => void;
  toast: any;
};

export function useMessageRenderer({
  isDarkMode,
  collapsedSections,
  isTyping,
  onToggleSection,
  onEditCode,
  onExportReport,
  toast,
}: MessageRendererProps) {
  // 渲染 Markdown 内容
  const renderMarkdownContent = useCallback(
    (content: string, options?: { withinSection?: boolean }) => {
      const withinSection = options?.withinSection ?? false;
      const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);

      return (
        <div className="prose prose-sm max-w-none dark:prose-invert break-words [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
          {parts.map((part, index) => {
            const codeBlockMatch = part.match(/```(\w+)?\n([\s\S]*?)```/);
            if (codeBlockMatch) {
              const [, language, code] = codeBlockMatch;
              return (
                <CodeBlockView
                  key={index}
                  language={language || "python"}
                  code={code}
                  showHeader={!withinSection}
                  isDarkMode={isDarkMode}
                  onEdit={onEditCode}
                />
              );
            }

            if (part.trim()) {
              return (
                <ReactMarkdown
                  key={index}
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: ({ children, ...props }: any) => (
                      <code
                        className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold mt-4 mb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold mt-4 mb-2">
                        {children}
                      </h3>
                    ),
                    a: ({ href, children }) => {
                      const normalized = normalizeToLocalFileUrl(
                        String(href || "")
                      );
                      const corrected = ensureGeneratedInUrl(normalized);
                      const proxied = `${API_CONFIG.BACKEND_BASE_URL
                        }/proxy?url=${encodeURIComponent(corrected)}`;
                      return (
                        <a
                          href={proxied}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      );
                    },
                    img: ({ src, alt }: any) => {
                      const normalizedSrc = normalizeToLocalFileUrl(src || "");
                      const correctedSrc = ensureGeneratedInUrl(normalizedSrc);
                      const proxiedSrc = `${API_CONFIG.BACKEND_BASE_URL
                        }/proxy?url=${encodeURIComponent(correctedSrc)}`;
                      return (
                        <img
                          src={proxiedSrc}
                          alt={alt || ""}
                          className="max-w-full h-auto rounded-lg my-2"
                        />
                      );
                    },
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-5 space-y-1">{children}</ol>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-5 space-y-1">{children}</ul>
                    ),
                  }}
                >
                  {part}
                </ReactMarkdown>
              );
            }

            return null;
          })}
        </div>
      );
    },
    [isDarkMode, onEditCode]
  );

  // 渲染 Section 内容
  const renderSectionContent = useCallback(
    (content: string) => {
      return renderMarkdownContent(content, { withinSection: true });
    },
    [renderMarkdownContent]
  );

  // 流式渲染
  const renderMessageWithSectionsStreaming = useCallback(
    (content: string, messageIndex?: number) => {
      const sectionTypes: StructuredSectionType[] = [
        "Analyze",
        "Understand",
        "Code",
        "Execute",
        "Answer",
        "File",
      ];

      if (!content.includes("<")) {
        return (
          <div className="text-sm break-words whitespace-pre-wrap">
            {content}
          </div>
        );
      }

      const parts: React.ReactNode[] = [];
      const openRe = /<(Analyze|Understand|Code|Execute|Answer|File)>/g;
      let cursor = 0;
      let sectionIndex = 0;
      let m: RegExpExecArray | null;

      while ((m = openRe.exec(content)) !== null) {
        const type = m[1] as StructuredSectionType;
        const start = m.index;

        if (start > cursor) {
          const before = content.slice(cursor, start);
          parts.push(
            <StreamingMarkdownBlock
              key={`stream-md-${cursor}`}
              className="markdown-content mb-2"
              content={before}
              renderMarkdownContent={renderMarkdownContent}
            />
          );
        }

        const openTag = m[0];
        const openEnd = start + openTag.length;
        const closeTag = `</${type}>`;
        const closeIdx = content.indexOf(closeTag, openEnd);
        const isComplete = closeIdx !== -1;
        const bodyEnd = isComplete ? closeIdx : content.length;
        const body = content.slice(openEnd, bodyEnd).trim();

        const baseKey = `${type}-${sectionIndex}`;
        const msgKey =
          messageIndex !== undefined ? `msg${messageIndex}-${type}-${sectionIndex}` : baseKey;
        const sectionKey = msgKey;
        const isCollapsed =
          (collapsedSections as any)[msgKey] ??
          (collapsedSections as any)[baseKey] ??
          false;

        const toggleSection = () => {
          onToggleSection(sectionKey, baseKey);
        };

        parts.push(
          <div
            key={`stream-section-${sectionKey}`}
            className={`mb-4 border rounded-lg overflow-hidden ${sectionConfigs[type].color}`}
            data-section={type}
            data-section-key={sectionKey}
          >
            <div className="flex items-center justify-between px-3 py-2 bg-white/60 dark:bg-black/30 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSection}
                  className="h-5 w-5 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
                <span className="text-sm">{sectionConfigs[type].icon}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {type}
                </span>
                {!isComplete && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    （生成中）
                  </span>
                )}
              </div>
            </div>
            {!isCollapsed && (
              <div className="p-3">
                <StreamingSectionBody
                  type={type}
                  content={body}
                  isComplete={isComplete}
                  renderSectionContent={renderSectionContent}
                />
              </div>
            )}
          </div>
        );

        sectionIndex += 1;
        cursor = isComplete ? closeIdx + closeTag.length : content.length;
        openRe.lastIndex = cursor;

        if (!isComplete) break;
      }

      if (cursor < content.length) {
        const after = content.slice(cursor);
        if (after.trim()) {
          parts.push(
            <div key="stream-text-end" className="text-sm break-words whitespace-pre-wrap">
              {after}
            </div>
          );
        }
      }

      if (parts.length === 0) {
        return (
          <div className="text-sm break-words whitespace-pre-wrap">
            {content}
          </div>
        );
      }

      return <>{parts}</>;
    },
    [collapsedSections, renderMarkdownContent, renderSectionContent, onToggleSection]
  );

  // 完整渲染
  const renderMessageWithSections = useCallback(
    (content: string, messageIndex?: number) => {
      const allMatches: Array<{
        type: keyof typeof sectionConfigs;
        content: string;
        position: number;
        fullMatch: string;
      }> = [];

      Object.keys(sectionConfigs).forEach((type) => {
        const regex = new RegExp(`<${type}>([\\s\\S]*?)</${type}>`, "g");
        let match;

        while ((match = regex.exec(content)) !== null) {
          allMatches.push({
            type: type as keyof typeof sectionConfigs,
            content: match[1].trim(),
            position: match.index,
            fullMatch: match[0],
          });
        }
      });

      if (allMatches.length === 0) {
        return (
          <div className="markdown-content">{renderMarkdownContent(content)}</div>
        );
      }

      allMatches.sort((a, b) => a.position - b.position);

      const parts = [];
      let lastPosition = 0;

      allMatches.forEach((match, index) => {
        if (match.position > lastPosition) {
          const beforeText = content.slice(lastPosition, match.position);
          if (beforeText.trim()) {
            parts.push(
              <div key={`text-${index}`} className="markdown-content mb-2">
                {renderMarkdownContent(beforeText)}
              </div>
            );
          }
        }

        const config = sectionConfigs[match.type];
        const baseKey = `${match.type}-${index}`;
        const msgKey =
          messageIndex !== undefined
            ? `msg${messageIndex}-${match.type}-${index}`
            : baseKey;
        const sectionKey = msgKey;
        const isCollapsed =
          (collapsedSections as any)[msgKey] ??
          (collapsedSections as any)[baseKey] ??
          false;

        const toggleSection = () => {
          onToggleSection(msgKey, baseKey);
        };

        let sectionBody = match.content;
        let fileGallery: JSX.Element | null = null;
        if (match.type === "File") {
          const files = parseGeneratedFiles(match.content, normalizeToLocalFileUrl);
          if (files.length) {
            fileGallery = (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-2">相关文件</div>
                <div className="grid grid-cols-2 gap-2">
                  {files.map((f, i) => {
                    const correctedUrl = ensureGeneratedInUrl(f.url);
                    const proxiedUrl = `${API_CONFIG.BACKEND_BASE_URL
                      }/proxy?url=${encodeURIComponent(correctedUrl)}`;
                    return (
                      <div
                        key={i}
                        className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden bg-white dark:bg-black"
                      >
                        {f.isImage ? (
                          <a href={proxiedUrl} target="_blank" rel="noreferrer">
                            <img
                              src={proxiedUrl}
                              alt={f.name}
                              className="w-full h-28 object-contain bg-white dark:bg-black"
                            />
                          </a>
                        ) : (
                          <a
                            href={proxiedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block p-2 text-xs truncate hover:bg-gray-50 dark:hover:bg-gray-900"
                          >
                            {f.name}
                          </a>
                        )}
                        <div className="flex items-center justify-between px-2 py-1 border-t border-gray-200 dark:border-gray-800">
                          <div className="text-[10px] truncate max-w-[70%] text-gray-500">
                            {f.name}
                          </div>
                          <a
                            href={proxiedUrl}
                            download
                            className="text-[10px] text-blue-600 hover:underline"
                          >
                            下载
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
        }

        parts.push(
          <div
            key={`section-${index}`}
            className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            data-section={match.type}
            data-section-key={sectionKey}
          >
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSection}
                  className="h-5 w-5 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
                <span className="text-sm">{config.icon}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {match.type}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {match.type === "Answer" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (isTyping) {
                        toast({
                          description: "执行中，暂时无法导出",
                          variant: "destructive",
                        });
                        return;
                      }
                      await onExportReport();
                    }}
                    className="h-5 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="后端导出 PDF/MD 到 workspace"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
                {(match.type === "Code" ||
                  match.type === "Analyze" ||
                  match.type === "Understand") && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const text =
                            match.type === "Code"
                              ? extractCode(match.content)
                              : match.content;
                          const ok = await copyToClipboard(text.trim());
                          toast({
                            description: ok ? "已复制" : "复制失败",
                            variant: ok ? undefined : "destructive",
                          });
                        }}
                        className="h-5 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {match.type === "Code" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const code = extractCode(match.content);
                            onEditCode(code);
                          }}
                          className="h-5 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                {match.type === "Execute" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const executionOutput = extractCode(
                        sectionBody || match.content || ""
                      );
                      const textToCopy = executionOutput || sectionBody || "";
                      if (textToCopy.trim()) {
                        const ok = await copyToClipboard(textToCopy.trim());
                        toast({
                          description: ok ? "已复制" : "复制失败",
                          variant: ok ? undefined : "destructive",
                        });
                      }
                    }}
                    className="h-5 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="复制此 Execute 的输出"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            {!isCollapsed && (
              <div
                className={`p-3 ${match.type === "Answer" ? "answer-body" : ""}`}
              >
                {renderSectionContent(sectionBody)}
                {fileGallery}
              </div>
            )}
          </div>
        );

        lastPosition = match.position + match.fullMatch.length;
      });

      if (lastPosition < content.length) {
        const afterText = content.slice(lastPosition);
        if (afterText.trim()) {
          parts.push(
            <div key="text-end" className="markdown-content mt-2">
              {renderMarkdownContent(afterText)}
            </div>
          );
        }
      }

      return <>{parts}</>;
    },
    [collapsedSections, isTyping, renderMarkdownContent, renderSectionContent, toast, onToggleSection, onEditCode, onExportReport]
  );

  // 提取消息中的所有步骤
  const extractSections = useCallback((content: string, messageIndex?: number) => {
    const sectionConfigSimple = {
      Analyze: { icon: "🔍", color: "bg-blue-500" },
      Understand: { icon: "🧠", color: "bg-cyan-500" },
      Code: { icon: "💻", color: "bg-gray-500" },
      Execute: { icon: "⚡", color: "bg-orange-500" },
      Answer: { icon: "✅", color: "bg-green-500" },
      File: { icon: "📎", color: "bg-purple-500" },
    };

    const allMatches: Array<{
      type: keyof typeof sectionConfigSimple;
      position: number;
    }> = [];

    Object.keys(sectionConfigSimple).forEach((type) => {
      const regex = new RegExp(`<${type}>([\\s\\S]*?)</${type}>`, "g");
      let match;

      while ((match = regex.exec(content)) !== null) {
        allMatches.push({
          type: type as keyof typeof sectionConfigSimple,
          position: match.index,
        });
      }
    });

    allMatches.sort((a, b) => a.position - b.position);

    return allMatches.map((m, index) => ({
      type: m.type,
      sectionKey:
        messageIndex !== undefined
          ? `msg${messageIndex}-${m.type}-${index}`
          : `${m.type}-${index}`,
      config: sectionConfigSimple[m.type],
    }));
  }, []);

  return {
    renderMarkdownContent,
    renderSectionContent,
    renderMessageWithSectionsStreaming,
    renderMessageWithSections,
    extractSections,
  };
}
