import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8200";

// Session 过期时间（秒）- 可通过环境变量配置，默认 24 小时
const SESSION_EXPIRE_SECONDS = parseInt(process.env.SESSION_EXPIRE_HOURS || "24") * 60 * 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const response = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // 创建响应并设置 cookie
    const res = NextResponse.json(data);
    
    // 如果后端返回了 token，设置到 cookie
    if (data.token) {
      res.cookies.set("auth_token", data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_EXPIRE_SECONDS,
        path: "/",
      });
    }

    // 将用户信息保存到 cookie 中，方便前端恢复 session
    // 注意：用户信息不包含敏感信息（如密码），可以存储在非 httpOnly cookie 中
    if (data.user) {
      res.cookies.set("user_info", JSON.stringify(data.user), {
        httpOnly: false, // 允许前端 JavaScript 读取
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_EXPIRE_SECONDS,
        path: "/",
      });
    }

    return res;
  } catch (error) {
    console.error("Proxy POST /auth/login error:", error);
    return NextResponse.json(
      { error: "登录请求失败" },
      { status: 500 }
    );
  }
}
