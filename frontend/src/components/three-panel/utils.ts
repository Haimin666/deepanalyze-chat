// 通用工具函数

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * 复制文本到剪贴板
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // 优先使用安全的 Clipboard API
    if (
      typeof navigator !== "undefined" &&
      (navigator as any).clipboard &&
      typeof (navigator as any).clipboard.writeText === "function"
    ) {
      await (navigator as any).clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // 继续尝试后备方案
  }
  try {
    // 后备方案：隐形 textarea + execCommand
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch (e) {
    return false;
  }
};

/**
 * 从内容中提取代码块
 */
export const extractCode = (content: string): string => {
  const codeBlockMatch = content.match(/```(?:python)?\n?([\s\S]*?)```/);
  return codeBlockMatch ? codeBlockMatch[1].trim() : content;
};

/**
 * 根据扩展名猜测语言
 */
export const guessLanguageByExtension = (ext: string): string => {
  const e = ext.toLowerCase();
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    json: "json",
    py: "python",
    md: "markdown",
    html: "html",
    css: "css",
    sh: "bash",
    yml: "yaml",
    yaml: "yaml",
    csv: "csv",
    txt: "text",
    go: "go",
    rs: "rust",
    java: "java",
    php: "php",
    sql: "sql",
  };
  return map[e] || "text";
};

/**
 * 获取文件扩展名
 */
export const getExt = (name?: string, ext?: string): string => {
  const fromExt = (ext || "").replace(/^\./, "").toLowerCase();
  if (fromExt) return fromExt;
  if (!name) return "txt";
  const p = name.lastIndexOf(".");
  return p > -1 ? name.slice(p + 1).toLowerCase() : "txt";
};

/**
 * 获取消息之前最近的用户问题内容
 */
export const getPrevUserQuestionText = (
  messages: Array<{ sender: string; content?: string }>,
  index: number
): string => {
  for (let i = index - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.sender === "user") return m.content || "";
  }
  return "";
};

/**
 * 构建报告文件名
 */
export const buildReportFilename = (question: string): string => {
  const clean = (question || "").replace(/\s+/g, " ").trim();
  let tokens = clean.split(/\s+/).filter(Boolean);
  let base = "";
  if (tokens.length <= 1) {
    // 中文/无空格：直接取前 5 个字符，不再用下划线
    base = clean.replace(/\s+/g, "").slice(0, 5);
  } else {
    // 英文/有空格：取前 5 个词，用下划线连接
    base = tokens
      .slice(0, 5)
      .map((t) => t.replace(/[\\/:*?"<>|]/g, ""))
      .filter(Boolean)
      .join("_");
  }
  base = base.slice(0, 120);
  return `Report_${base || "Untitled"}.pdf`;
};

/**
 * 解析 Markdown 中的文件/图片链接
 */
export const parseGeneratedFiles = (
  content: string,
  normalizeToLocalFileUrl: (url: string) => string
): Array<{ name: string; url: string; isImage: boolean }> => {
  const result: { name: string; url: string; isImage: boolean }[] = [];
  let m: RegExpExecArray | null;
  // 1) 列表形如: - [name](url)
  const linkRe = /\- \[(.*?)\]\((.*?)\)/g;
  while ((m = linkRe.exec(content)) !== null) {
    const name = m[1];
    const url = normalizeToLocalFileUrl(m[2]);
    const isImage = /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url);
    result.push({ name, url, isImage });
  }
  // 2) 图片 Markdown: ![name](url)
  const imgRe = /!\[(.*?)\]\((.*?)\)/g;
  while ((m = imgRe.exec(content)) !== null) {
    const name = m[1];
    const url = normalizeToLocalFileUrl(m[2]);
    result.push({ name, url, isImage: true });
  }
  // 3) 兜底：文中出现的裸链接
  const urlRe = /(https?:\/\/[^\s)]+)/g;
  while ((m = urlRe.exec(content)) !== null) {
    const url = normalizeToLocalFileUrl(m[1]);
    const isImage = /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url);
    if (isImage)
      result.push({ name: url.split("/")?.pop() || "image", url, isImage });
  }
  // 去重同 url
  const seen = new Set<string>();
  return result.filter((f) =>
    seen.has(f.url) ? false : (seen.add(f.url), true)
  );
};
