import { NextResponse } from "next/server";

// 登出接口
export async function POST() {
  return NextResponse.json({
    success: true,
    message: "已成功登出",
  });
}
