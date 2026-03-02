"""
用户服务层 - 使用MySQL数据库
"""
from typing import Optional, List
from datetime import datetime
import uuid

from services.database_service import db_service
from models.workspace import User
from models.database import UserModel


class UserService:
    """用户服务 - 数据库版本"""

    def authenticate(self, username: str, password: str) -> Optional[User]:
        """验证用户登录"""
        user = db_service.authenticate_user(username, password)
        if not user:
            return None
        return User(
            id=user.id,
            username=user.username,
            name=user.name,
            role=user.role,
            createdAt=user.created_at.isoformat() + "Z" if user.created_at else ""
        )

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """通过ID获取用户"""
        user = db_service.get_user_by_id(user_id)
        if not user:
            return None
        return User(
            id=user.id,
            username=user.username,
            name=user.name,
            role=user.role,
            createdAt=user.created_at.isoformat() + "Z" if user.created_at else ""
        )

    def get_user_by_username(self, username: str) -> Optional[User]:
        """通过用户名获取用户"""
        user = db_service.get_user_by_username(username)
        if not user:
            return None
        return User(
            id=user.id,
            username=user.username,
            name=user.name,
            role=user.role,
            createdAt=user.created_at.isoformat() + "Z" if user.created_at else ""
        )

    def get_users(self, page: int = 1, limit: int = 10, search: str = "") -> tuple[List[User], int]:
        """获取用户列表"""
        users, total = db_service.get_users(page=page, limit=limit, search=search)
        return [
            User(
                id=u.id,
                username=u.username,
                name=u.name,
                role=u.role,
                createdAt=u.created_at.isoformat() + "Z" if u.created_at else ""
            ) for u in users
        ], total

    def create_user(self, username: str, password: str, name: str, role: str = "user") -> User:
        """创建用户"""
        # 检查用户名是否已存在
        existing = db_service.get_user_by_username(username)
        if existing:
            raise ValueError("用户名已存在")
        
        user = db_service.create_user(username, password, name, role)
        return User(
            id=user.id,
            username=user.username,
            name=user.name,
            role=user.role,
            createdAt=user.created_at.isoformat() + "Z" if user.created_at else ""
        )

    def update_user(self, user_id: str, name: str = None, username: str = None, role: str = None) -> Optional[User]:
        """更新用户"""
        user = db_service.update_user(user_id, name=name, username=username, role=role)
        if not user:
            return None
        return User(
            id=user.id,
            username=user.username,
            name=user.name,
            role=user.role,
            createdAt=user.created_at.isoformat() + "Z" if user.created_at else ""
        )

    def delete_user(self, user_id: str) -> bool:
        """删除用户"""
        return db_service.delete_user(user_id)

    def reset_password(self, user_id: str, new_password: str) -> bool:
        """重置用户密码"""
        return db_service.update_user_password(user_id, new_password)


class SessionService:
    """会话服务 - 数据库版本"""

    def get_sessions(self, user_id: str) -> List[dict]:
        """获取用户的会话列表"""
        sessions = db_service.get_sessions_by_user(user_id)
        return [
            {
                "id": s.id,
                "title": s.title,
                "messageCount": s.message_count,
                "preview": s.preview,
                "createdAt": s.created_at.isoformat() + "Z" if s.created_at else "",
                "updatedAt": s.updated_at.isoformat() + "Z" if s.updated_at else ""
            } for s in sessions
        ]

    def get_session(self, session_id: str, user_id: str) -> Optional[dict]:
        """获取会话详情"""
        session = db_service.get_session_by_id(session_id)
        if not session or session.user_id != user_id:
            return None
        return {
            "id": session.id,
            "title": session.title,
            "messageCount": session.message_count,
            "preview": session.preview,
            "createdAt": session.created_at.isoformat() + "Z" if session.created_at else "",
            "updatedAt": session.updated_at.isoformat() + "Z" if session.updated_at else ""
        }

    def create_session(self, session_id: str, user_id: str, title: str = "新会话") -> dict:
        """创建会话"""
        session = db_service.create_session(session_id, user_id, title)
        return {
            "id": session.id,
            "title": session.title,
            "messageCount": session.message_count,
            "preview": session.preview,
            "createdAt": session.created_at.isoformat() + "Z" if session.created_at else "",
            "updatedAt": session.updated_at.isoformat() + "Z" if session.updated_at else ""
        }

    def update_session(self, session_id: str, user_id: str, title: str = None, 
                      message_count: int = None, preview: str = None) -> Optional[dict]:
        """更新会话"""
        session = db_service.get_session_by_id(session_id)
        if not session or session.user_id != user_id:
            return None
        
        updated = db_service.update_session(session_id, title=title, message_count=message_count, preview=preview)
        if not updated:
            return None
        return {
            "id": updated.id,
            "title": updated.title,
            "messageCount": updated.message_count,
            "preview": updated.preview,
            "createdAt": updated.created_at.isoformat() + "Z" if updated.created_at else "",
            "updatedAt": updated.updated_at.isoformat() + "Z" if updated.updated_at else ""
        }

    def delete_session(self, session_id: str, user_id: str) -> bool:
        """删除会话"""
        session = db_service.get_session_by_id(session_id)
        if not session or session.user_id != user_id:
            return False
        return db_service.delete_session(session_id)

    def get_messages(self, session_id: str, user_id: str) -> List[dict]:
        """获取会话的消息列表"""
        session = db_service.get_session_by_id(session_id)
        if not session or session.user_id != user_id:
            return []
        
        messages = db_service.get_messages_by_session(session_id)
        return [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "createdAt": m.created_at.isoformat() + "Z" if m.created_at else ""
            } for m in messages
        ]

    def save_message(self, session_id: str, user_id: str, role: str, content: str) -> dict:
        """保存消息"""
        session = db_service.get_session_by_id(session_id)
        if not session:
            # 创建会话
            db_service.create_session(session_id, user_id)
        
        msg_id = f"msg-{uuid.uuid4().hex[:12]}"
        db_service.create_message(msg_id, session_id, role, content)
        
        # 更新会话
        messages = db_service.get_messages_by_session(session_id)
        preview = content[:100] if len(content) > 100 else content
        db_service.update_session(session_id, message_count=len(messages), preview=preview)
        
        return {"id": msg_id, "success": True}

    def save_messages_batch(self, session_id: str, user_id: str, messages: List[dict]) -> dict:
        """批量保存消息"""
        session = db_service.get_session_by_id(session_id)
        if not session:
            db_service.create_session(session_id, user_id)
        
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
        db_service.update_session(session_id, message_count=len(all_messages), preview=preview)
        
        return {"success": True, "messageCount": len(messages)}
