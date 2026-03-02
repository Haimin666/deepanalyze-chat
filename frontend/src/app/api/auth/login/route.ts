import { NextRequest, NextResponse } from "next/server";

// 预设用户数据 - 只保留 admin 用户
const PRESET_USERS = [
  {
    id: "1",
    username: "admin",
    name: "Admin User",
    role: "admin",
    password: "admin123",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 查找用户
    const user = PRESET_USERS.find((u) => u.username === username);

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token: `mock_token_${Date.now()}`, // 模拟 token
    });
  } catch (error) {
    return NextResponse.json(
      { error: "请求处理失败" },
      { status: 500 }
    );
  }
}
