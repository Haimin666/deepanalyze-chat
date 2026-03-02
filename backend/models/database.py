"""
数据库模型定义
使用 SQLAlchemy ORM
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class UserModel(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(20), default="user")
    avatar = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    sessions = relationship("SessionModel", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "name": self.name,
            "role": self.role,
            "avatar": self.avatar,
            "createdAt": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class SessionModel(Base):
    """会话表"""
    __tablename__ = "sessions"

    id = Column(String(100), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="新会话")
    message_count = Column(Integer, default=0)
    preview = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    user = relationship("UserModel", back_populates="sessions")
    messages = relationship("MessageModel", back_populates="session", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "messageCount": self.message_count,
            "preview": self.preview,
            "createdAt": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }


class MessageModel(Base):
    """消息表"""
    __tablename__ = "messages"

    id = Column(String(100), primary_key=True)
    session_id = Column(String(100), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    session = relationship("SessionModel", back_populates="messages")

    def to_dict(self):
        return {
            "id": self.id,
            "sessionId": self.session_id,
            "role": self.role,
            "content": self.content,
            "createdAt": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class WorkspaceFileModel(Base):
    """工作区文件表"""
    __tablename__ = "workspace_files"

    id = Column(String(100), primary_key=True)
    session_id = Column(String(100), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    path = Column(String(500), nullable=False)
    size = Column(Integer, default=0)
    extension = Column(String(50), nullable=True)
    is_generated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "sessionId": self.session_id,
            "name": self.name,
            "path": self.path,
            "size": self.size,
            "extension": self.extension,
            "isGenerated": self.is_generated,
            "createdAt": self.created_at.isoformat() + "Z" if self.created_at else None,
        }
