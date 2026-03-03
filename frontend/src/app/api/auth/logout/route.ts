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

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const token = getTokenFromCookie(cookieHeader);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
      method: "POST",
      headers,
    });

    const data = await response.json();

    // 清除本地 cookie（token 和用户信息）
    const res = NextResponse.json(data);
    res.cookies.delete("auth_token");
    res.cookies.delete("user_info");

    return res;
  } catch (error) {
    console.error("Proxy POST /auth/logout error:", error);
    // 即使后端失败，也清除本地 cookie
    const res = NextResponse.json({ success: true, message: "已成功登出" });
    res.cookies.delete("auth_token");
    res.cookies.delete("user_info");
    return res;
  }
}
