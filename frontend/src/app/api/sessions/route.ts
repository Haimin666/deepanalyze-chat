import { NextRequest, NextResponse } from "next/server";

// 模拟会话存储（实际项目中应该使用数据库）
const sessionsStore: Record<string, {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview?: string;
  messages: any[];
}> = {};

// 获取会话列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "default";

  // 获取用户的所有会话
  const sessions = Object.values(sessionsStore)
    .filter((s) => s.id.startsWith(userId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messageCount: s.messageCount,
      preview: s.preview,
    })),
    total: sessions.length,
  });
}

// 创建/保存会话
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, messages, preview } = body;

    const sessionKey = id || `session_${Date.now()}`;
    const now = new Date().toISOString();

    sessionsStore[sessionKey] = {
      id: sessionKey,
      title: title || "新会话",
      createdAt: sessionsStore[sessionKey]?.createdAt || now,
      updatedAt: now,
      messageCount: messages?.length || 0,
      preview: preview || "",
      messages: messages || [],
    };

    return NextResponse.json({
      success: true,
      session: {
        id: sessionKey,
        title: sessionsStore[sessionKey].title,
        createdAt: sessionsStore[sessionKey].createdAt,
        updatedAt: sessionsStore[sessionKey].updatedAt,
        messageCount: sessionsStore[sessionKey].messageCount,
        preview: sessionsStore[sessionKey].preview,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "保存会话失败" },
      { status: 500 }
    );
  }
}

// 删除会话
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "缺少会话ID" },
        { status: 400 }
      );
    }

    if (!sessionsStore[id]) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      );
    }

    delete sessionsStore[id];

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "删除会话失败" },
      { status: 500 }
    );
  }
}
