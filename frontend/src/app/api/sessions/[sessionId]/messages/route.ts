import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8200";

// 从 cookie 中获取 auth token
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

// 获取会话的消息列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const cookieHeader = request.headers.get("cookie") || "";
    const token = getTokenFromCookie(cookieHeader);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_BASE_URL}/sessions/${sessionId}/messages`, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy GET /sessions/[sessionId]/messages error:", error);
    return NextResponse.json(
      { error: "获取消息列表失败" },
      { status: 500 }
    );
  }
}

// 保存消息到会话
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const cookieHeader = request.headers.get("cookie") || "";
    const token = getTokenFromCookie(cookieHeader);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_BASE_URL}/sessions/${sessionId}/messages`, {
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
    console.error("Proxy POST /sessions/[sessionId]/messages error:", error);
    return NextResponse.json(
      { error: "保存消息失败" },
      { status: 500 }
    );
  }
}
