import { NextRequest, NextResponse } from "next/server";

// 模拟用户数据库 - 只保留 admin 用户
let users = [
  {
    id: "1",
    username: "admin",
    name: "Admin User",
    role: "admin",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

// 密码存储（实际应用中应使用加密）
const passwords: Record<string, string> = {
  "1": "admin123",
};

// 获取用户列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";

  // 过滤用户
  let filteredUsers = users;
  if (search) {
    filteredUsers = users.filter(
      (u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase())
    );
  }

  // 分页
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedUsers = filteredUsers.slice(start, end);

  return NextResponse.json({
    success: true,
    users: paginatedUsers,
    total: filteredUsers.length,
    page,
    limit,
    totalPages: Math.ceil(filteredUsers.length / limit),
  });
}

// 创建用户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, role = "user", password } = body;

    // 验证必填字段
    if (!name || !username || !password) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    if (users.find((u) => u.username === username)) {
      return NextResponse.json(
        { error: "用户名已存在" },
        { status: 400 }
      );
    }

    // 创建新用户
    const newId = Date.now().toString();
    const newUser = {
      id: newId,
      name,
      username,
      role,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    passwords[newId] = password;

    return NextResponse.json({
      success: true,
      user: newUser,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "创建用户失败" },
      { status: 500 }
    );
  }
}

// 更新用户
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUserId, name, username, role } = body;

    const userIndex = users.findIndex((u) => u.id === targetUserId);
    if (userIndex === -1) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // 检查用户名是否被其他用户占用
    if (username && username !== users[userIndex].username) {
      if (users.find((u) => u.username === username && u.id !== targetUserId)) {
        return NextResponse.json(
          { error: "用户名已存在" },
          { status: 400 }
        );
      }
    }

    // 更新用户
    users[userIndex] = {
      ...users[userIndex],
      name: name || users[userIndex].name,
      username: username || users[userIndex].username,
      role: role || users[userIndex].role,
    };

    return NextResponse.json({
      success: true,
      user: users[userIndex],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "更新用户失败" },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("userId");

    if (!id) {
      return NextResponse.json(
        { error: "缺少用户ID" },
        { status: 400 }
      );
    }

    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // 不允许删除管理员
    if (users[userIndex].role === "admin" && users.filter((u) => u.role === "admin").length <= 1) {
      return NextResponse.json(
        { error: "不能删除唯一的管理员" },
        { status: 400 }
      );
    }

    users.splice(userIndex, 1);
    delete passwords[id];

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "删除用户失败" },
      { status: 500 }
    );
  }
}
