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

// 上传文件到指定目录
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dir = searchParams.get("dir") || "";
    const sessionId = searchParams.get("session_id") || "";
    const cookieHeader = request.headers.get("cookie") || "";
    const token = getTokenFromCookie(cookieHeader);

    // 获取表单数据
    const formData = await request.formData();

    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // 构建完整的 URL，包含 dir 和 session_id
    let url = `${BACKEND_BASE_URL}/workspace/upload-to`;
    const params = new URLSearchParams();
    if (dir) params.append("dir", dir);
    if (sessionId) params.append("session_id", sessionId);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log("[Upload API] Forwarding to:", url);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Upload API] Error:", response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log("[Upload API] Success:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy POST /workspace/upload-to error:", error);
    return NextResponse.json(
      { error: "上传文件失败" },
      { status: 500 }
    );
  }
}
