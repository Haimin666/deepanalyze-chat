import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8200";

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";

    const response = await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookieHeader,
      },
    });

    const data = await response.json();

    // 清除本地 cookie
    const res = NextResponse.json(data);
    res.cookies.delete("auth_token");

    return res;
  } catch (error) {
    console.error("Proxy POST /auth/logout error:", error);
    // 即使后端失败，也清除本地 cookie
    const res = NextResponse.json({ success: true, message: "已成功登出" });
    res.cookies.delete("auth_token");
    return res;
  }
}
