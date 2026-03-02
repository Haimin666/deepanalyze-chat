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

// 聊天补全（流式响应）
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

    const response = await fetch(`${BACKEND_BASE_URL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    // 流式响应直接透传
    if (response.body) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "text/plain",
        },
      });
    }

    return NextResponse.json({ error: "No response body" }, { status: 500 });
  } catch (error) {
    console.error("Proxy POST /chat/completions error:", error);
    return NextResponse.json(
      { error: "聊天请求失败" },
      { status: 500 }
    );
  }
}
