import { NextRequest, NextResponse } from "next/server";

// 模拟获取当前用户信息
export async function GET(request: NextRequest) {
  // 从 header 获取 token（实际项目中应该验证 token）
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "未授权" },
      { status: 401 }
    );
  }

  // 模拟返回用户信息
  return NextResponse.json({
    user: {
      id: "1",
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
      createdAt: "2024-01-01T00:00:00Z",
    },
  });
}
