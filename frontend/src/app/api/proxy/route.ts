import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8200";

function getTokenFromCookie(cookieHeader: string): string | null {
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'auth_token' && value) {
      return value;
    }
  }
  return null;
}

// GET 请求 - 用于文件下载代理
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const download = searchParams.get("download"); // 是否强制下载
    const filename = searchParams.get("filename"); // 指定文件名
    const cookieHeader = request.headers.get("cookie") || "";
    const token = getTokenFromCookie(cookieHeader);

    if (!url) {
      return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
    }

    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // 直接代理请求
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Proxy fetch failed: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const data = await response.arrayBuffer();

    // 构建响应头
    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
    };

    // 如果指定了 download 参数或者文件是 PDF，强制下载
    const shouldDownload = download === "true" || contentType.includes("pdf");
    if (shouldDownload) {
      // 从 URL 中提取文件名或使用指定的文件名
      const defaultFilename = url.split("/").pop()?.split("?")[0] || "download";
      const finalFilename = filename || defaultFilename;
      responseHeaders["Content-Disposition"] = `attachment; filename="${encodeURIComponent(finalFilename)}"`;
    }

    return new NextResponse(data, {
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy GET /proxy error:", error);
    return NextResponse.json(
      { error: "代理请求失败" },
      { status: 500 }
    );
  }
}

// POST 请求 - 用于其他代理
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieHeader = request.headers.get("cookie") || "";
    const token = getTokenFromCookie(cookieHeader);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_BASE_URL}/proxy`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy POST /proxy error:", error);
    return NextResponse.json(
      { error: "代理请求失败" },
      { status: 500 }
    );
  }
}
