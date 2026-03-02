"""
会话控制器
处理聊天会话的增删改查
"""
from typing import Optional, List
from fastapi import HTTPException, Header
from datetime import datetime
import uuid

from services.database_service import db_service
from models.workspace import ChatSession, SessionCreate
from models.database import SessionModel, MessageModel


class SessionController:
    """会话控制器"""

    async def get_sessions(self, user_id: str) -> List[ChatSession]:
        """获取用户的会话列表"""
        sessions = db_service.get_sessions_by_user(user_id)
        return [
            ChatSession(
                id=s.id,
                title=s.title,
                createdAt=s.created_at.isoformat() + "Z" if s.created_at else "",
                updatedAt=s.updated_at.isoformat() + "Z" if s.updated_at else "",
                messageCount=s.message_count,
                preview=s.preview
            ) for s in sessions
        ]

    async def get_session(self, session_id: str, user_id: str) -> ChatSession:
        """获取会话详情"""
        session = db_service.get_session_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
        if session.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权访问此会话")
        
        return ChatSession(
            id=session.id,
            title=session.title,
            createdAt=session.created_at.isoformat() + "Z" if session.created_at else "",
            updatedAt=session.updated_at.isoformat() + "Z" if session.updated_at else "",
            messageCount=session.message_count,
            preview=session.preview
        )

    async def create_session(self, user_id: str, data: SessionCreate) -> ChatSession:
        """创建新会话"""
        session_id = data.id or f"session-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}"
        title = data.title or "新会话"
        
        session = db_service.create_session(session_id, user_id, title)
        
        # 如果有消息，保存消息
        if data.messages:
            for msg in data.messages:
                msg_id = f"msg-{uuid.uuid4().hex[:12]}"
                db_service.create_message(
                    message_id=msg_id,
                    session_id=session_id,
                    role=msg.get("role", "user"),
                    content=msg.get("content", "")
                )
            # 更新会话消息数
            db_service.update_session(session_id, message_count=len(data.messages))
        
        return ChatSession(
            id=session.id,
            title=session.title,
            createdAt=session.created_at.isoformat() + "Z" if session.created_at else "",
            updatedAt=session.updated_at.isoformat() + "Z" if session.updated_at else "",
            messageCount=session.message_count,
            preview=session.preview
        )

    async def update_session(self, session_id: str, user_id: str, title: str = None, 
                            message_count: int = None, preview: str = None) -> ChatSession:
        """更新会话"""
        session = db_service.get_session_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
        if session.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权修改此会话")
        
        session = db_service.update_session(
            session_id, 
            title=title, 
            message_count=message_count, 
            preview=preview
        )
        
        return ChatSession(
            id=session.id,
            title=session.title,
            createdAt=session.created_at.isoformat() + "Z" if session.created_at else "",
            updatedAt=session.updated_at.isoformat() + "Z" if session.updated_at else "",
            messageCount=session.message_count,
            preview=session.preview
        )

    async def delete_session(self, session_id: str, user_id: str) -> dict:
        """删除会话"""
        session = db_service.get_session_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
        if session.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权删除此会话")
        
        # 删除会话的消息
        db_service.delete_messages_by_session(session_id)
        # 删除会话
        db_service.delete_session(session_id)
        
        return {"success": True, "message": "会话已删除"}

    async def get_messages(self, session_id: str, user_id: str) -> List[dict]:
        """获取会话的消息列表"""
        session = db_service.get_session_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
        if session.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权访问此会话")
        
        messages = db_service.get_messages_by_session(session_id)
        return [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "createdAt": m.created_at.isoformat() + "Z" if m.created_at else ""
            } for m in messages
        ]

    async def save_message(self, session_id: str, user_id: str, role: str, content: str) -> dict:
        """保存消息到会话"""
        session = db_service.get_session_by_id(session_id)
        if not session:
            # 如果会话不存在，创建新会话
            session = db_service.create_session(session_id, user_id)
        
        if session.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权访问此会话")
        
        # 保存消息
        msg_id = f"msg-{uuid.uuid4().hex[:12]}"
        db_service.create_message(
            message_id=msg_id,
            session_id=session_id,
            role=role,
            content=content
        )
        
        # 更新会话信息
        messages = db_service.get_messages_by_session(session_id)
        preview = content[:100] if len(content) > 100 else content
        
        # 如果是第一条用户消息，将会话标题设置为消息内容的前30个字符
        title = None
        if role == "user" and session.title == "新会话":
            # 检查是否是第一条用户消息
            user_messages = [m for m in messages if m.role == "user"]
            if len(user_messages) == 1:
                title = content[:30] + ("..." if len(content) > 30 else "")
        
        db_service.update_session(
            session_id,
            title=title,
            message_count=len(messages),
            preview=preview
        )
        
        return {
            "id": msg_id,
            "success": True,
            "title": title
        }

    async def save_messages_batch(self, session_id: str, user_id: str, messages: List[dict]) -> dict:
        """批量保存消息"""
        session = db_service.get_session_by_id(session_id)
        if not session:
            session = db_service.create_session(session_id, user_id)
        
        if session.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权访问此会话")
        
        # 批量保存消息
        for msg in messages:
            msg_id = f"msg-{uuid.uuid4().hex[:12]}"
            db_service.create_message(
                message_id=msg_id,
                session_id=session_id,
                role=msg.get("role", "user"),
                content=msg.get("content", "")
            )
        
        # 更新会话
        all_messages = db_service.get_messages_by_session(session_id)
        last_msg = messages[-1] if messages else None
        preview = last_msg.get("content", "")[:100] if last_msg else ""
        db_service.update_session(
            session_id,
            message_count=len(all_messages),
            preview=preview
        )
        
        return {"success": True, "messageCount": len(messages)}
