// URL 处理工具函数

import { API_CONFIG } from "@/lib/config";

/**
 * 标准化本地文件 URL
 */
export const normalizeToLocalFileUrl = (rawUrl: string): string => {
  const base =
    (API_CONFIG as any).FILE_SERVER_BASE || "http://localhost:8100";
  const safeBase = base.replace(/\/$/, "");

  if (!rawUrl) return safeBase;
  const trimmed = String(rawUrl).trim();

  // 绝对 http/https 链接：若是 localhost/127.* 或端口为 8100，则重写到 FILE_SERVER_BASE
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const needRewrite =
        u.hostname === "localhost" ||
        u.hostname.startsWith("127.") ||
        u.port === "8100";
      if (needRewrite) {
        const b = new URL(safeBase + "/");
        return `${b.origin}${b.pathname.replace(/\/$/, "")}${u.pathname}${u.search
          }${u.hash}`;
      }
      return trimmed;
    } catch {
      // fallthrough to relative handling
    }
  }

  // 处理以 // 开头的协议相对链接
  if (/^\/\//.test(trimmed)) {
    const proto =
      typeof window !== "undefined" ? window.location.protocol : "http:";
    return proto + trimmed;
  }

  // 去掉开头的 ./
  const rel = trimmed.replace(/^\.\//, "");

  // 如果以 /workspace/ 开头，接到文件服务器
  if (/^\/workspace\//.test(rel)) return `${safeBase}${rel}`;
  if (/^workspace\//.test(rel)) return `${safeBase}/${rel}`;

  // 其它相对路径或文件名，也认为位于文件服务器根目录
  return `${safeBase}/${rel.replace(/^\//, "")}`;
};

/**
 * 若 URL 缺少 generated 目录，则在 session 段后注入 /generated
 */
export const ensureGeneratedInUrl = (url: string): string => {
  try {
    const u = new URL(url);
    // 仅处理指向文件服务器(8100)的链接
    if (!(u.hostname === "localhost" || u.hostname.startsWith("127."))) {
      return url;
    }
    // 路径形如 /session_xxx/xxx.png，则插入 /generated
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const [maybeSession, second] = parts;
      if (maybeSession.startsWith("session_") && second !== "generated") {
        const rest = parts.slice(1).join("/");
        u.pathname = `/${maybeSession}/generated/${rest}`;
        return u.toString();
      }
    }
    return url;
  } catch {
    return url;
  }
};
