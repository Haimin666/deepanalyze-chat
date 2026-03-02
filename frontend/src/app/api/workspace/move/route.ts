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

// 移动文件/目录
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const src = searchParams.get("src");
    const dstDir = searchParams.get("dst_dir") || "";
    const sessionId = searchParams.get("session_id") || "default";
    const cookieHeader = request.headers.get("cookie") || "";
    const token = getTokenFromCookie(cookieHeader);

    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${BACKEND_BASE_URL}/workspace/move?src=${encodeURIComponent(src || "")}&dst_dir=${encodeURIComponent(dstDir)}&session_id=${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, {
      method: "POST",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy POST /workspace/move error:", error);
    return NextResponse.json(
      { error: "移动文件失败" },
      { status: 500 }
    );
  }
}
