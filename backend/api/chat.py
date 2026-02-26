import os, json, re
from datetime import datetime
from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from core.database import get_db, SessionLocal
from core.config import MODEL_PATH
from services import chat_service
from services.llm_service import bot_stream, _extract_sections_from_messages, _save_md, _save_pdf
from services.workspace_service import get_session_workspace, build_download_url
from models.models import ChatSession, Message
from schemas.schemas import SessionResponse, MessageResponse

router = APIRouter()


@router.get("/chat/sessions", response_model=list[SessionResponse], tags=["Chat History"])
def get_sessions(db: Session = Depends(get_db)):
    return db.query(ChatSession).order_by(ChatSession.id.desc()).all()


@router.get("/chat/sessions/{session_id}/messages", response_model=list[MessageResponse], tags=["Chat History"])
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    return db.query(Message).filter(Message.session_id == session_id).order_by(Message.id.asc()).all()


@router.post("/chat/completions")
async def chat(body: dict = Body(...), db: Session = Depends(get_db)):
    messages = body.get("messages", [])
    workspace = body.get("workspace", [])
    session_id = body.get("session_id", "default")

    # 1. 保存用户的消息
    user_msg = ""
    if messages and messages[-1]["role"] == "user":
        user_msg = messages[-1]["content"]

    if user_msg:
        chat_service.ensure_session(db, session_id, title=user_msg[:20])
        chat_service.save_message(db, session_id, "user", user_msg)

    def generate():
        full_reply = ""
        # 2. 原始生成器流式输出
        for delta_content in bot_stream(messages, workspace, session_id):
            full_reply += delta_content
            chunk = {
                "id": "chatcmpl-stream", "object": "chat.completion.chunk",
                "created": int(datetime.now().timestamp()), "model": MODEL_PATH,
                "choices": [{"index": 0, "delta": {"content": delta_content}, "finish_reason": None}]
            }
            yield json.dumps(chunk) + "\n"

        yield json.dumps({
            "id": "chatcmpl-stream", "object": "chat.completion.chunk",
            "created": int(datetime.now().timestamp()), "model": MODEL_PATH,
            "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]
        }) + "\n"

        # 3. 拦截完整流并异步落库 (避免生成器中断关闭了 DB 会话)
        db_gen = SessionLocal()
        try:
            chat_service.save_message(db_gen, session_id, "assistant", full_reply)
            chat_service.enforce_message_limit(db_gen, session_id, max_limit=50)  # 执行50条限制
        finally:
            db_gen.close()

    return StreamingResponse(generate(), media_type="text/plain")


@router.post("/export/report")
async def export_report(body: dict = Body(...)):
    messages, title, session_id = body.get("messages", []), (body.get("title") or "").strip(), body.get("session_id",
                                                                                                        "default")
    workspace_dir = get_session_workspace(session_id)
    md_text = _extract_sections_from_messages(messages) or "(No segments found.)"
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = f"{re.sub(r'[^\\w\\-_.]+', '_', title)}_{ts}" if title else f"Report_{ts}"
    export_dir = os.path.join(workspace_dir, "generated")
    os.makedirs(export_dir, exist_ok=True)
    md_path = _save_md(md_text, base_name, export_dir)
    pdf_path = _save_pdf(md_text, base_name, export_dir)

    return JSONResponse({
        "message": "exported", "md": md_path.name, "pdf": pdf_path.name if pdf_path else None,
        "download_urls": {
            "md": build_download_url(f"{session_id}/generated/{md_path.name}"),
            "pdf": build_download_url(f"{session_id}/generated/{pdf_path.name}") if pdf_path else None
        }
    })