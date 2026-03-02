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

// 清空工作区
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const token = getTokenFromCookie(cookieHeader);

    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_BASE_URL}/workspace/clear`, {
      method: "POST",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy POST /workspace/clear error:", error);
    return NextResponse.json(
      { error: "清空工作区失败" },
      { status: 500 }
    );
  }
}
