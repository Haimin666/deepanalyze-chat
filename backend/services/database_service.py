"""
数据库服务层
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from config.database import DATABASE_URL
from models.database import Base, UserModel, SessionModel, MessageModel, WorkspaceFileModel


class DatabaseService:
    """数据库服务"""

    def __init__(self):
        self.engine = create_engine(
            DATABASE_URL,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            echo=False
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    def create_tables(self):
        """创建所有表"""
        Base.metadata.create_all(bind=self.engine)

    def get_session(self) -> Session:
        """获取数据库会话"""
        return self.SessionLocal()

    # ========== 用户相关 ==========

    def get_user_by_username(self, username: str) -> Optional[UserModel]:
        """通过用户名获取用户"""
        with self.get_session() as db:
            return db.query(UserModel).filter(UserModel.username == username).first()

    def get_user_by_id(self, user_id: str) -> Optional[UserModel]:
        """通过ID获取用户"""
        with self.get_session() as db:
            return db.query(UserModel).filter(UserModel.id == user_id).first()

    def get_users(self, page: int = 1, limit: int = 10, search: str = "") -> tuple[List[UserModel], int]:
        """获取用户列表"""
        with self.get_session() as db:
            query = db.query(UserModel)
            if search:
                search_pattern = f"%{search}%"
                query = query.filter(
                    (UserModel.name.like(search_pattern)) |
                    (UserModel.username.like(search_pattern))
                )
            total = query.count()
            users = query.order_by(UserModel.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
            return users, total

    def create_user(self, user_id: str, username: str, password_hash: str, name: str, role: str = "user") -> UserModel:
        """创建用户"""
        with self.get_session() as db:
            user = UserModel(
                id=user_id,
                username=username,
                password_hash=password_hash,
                name=name,
                role=role
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    def update_user(self, user_id: str, name: str = None, username: str = None, role: str = None) -> Optional[UserModel]:
        """更新用户"""
        with self.get_session() as db:
            user = db.query(UserModel).filter(UserModel.id == user_id).first()
            if not user:
                return None
            if name:
                user.name = name
            if username:
                user.username = username
            if role:
                user.role = role
            db.commit()
            db.refresh(user)
            return user

    def delete_user(self, user_id: str) -> bool:
        """删除用户"""
        with self.get_session() as db:
            user = db.query(UserModel).filter(UserModel.id == user_id).first()
            if not user:
                return False
            db.delete(user)
            db.commit()
            return True

    # ========== 会话相关 ==========

    def get_sessions_by_user(self, user_id: str) -> List[SessionModel]:
        """获取用户的会话列表"""
        with self.get_session() as db:
            return db.query(SessionModel).filter(
                SessionModel.user_id == user_id
            ).order_by(SessionModel.updated_at.desc()).all()

    def get_session_by_id(self, session_id: str) -> Optional[SessionModel]:
        """获取会话详情"""
        with self.get_session() as db:
            return db.query(SessionModel).filter(SessionModel.id == session_id).first()

    def create_session(self, session_id: str, user_id: str, title: str = "新会话") -> SessionModel:
        """创建会话"""
        with self.get_session() as db:
            session = SessionModel(
                id=session_id,
                user_id=user_id,
                title=title
            )
            db.add(session)
            db.commit()
            db.refresh(session)
            return session

    def update_session(self, session_id: str, title: str = None, message_count: int = None, preview: str = None) -> Optional[SessionModel]:
        """更新会话"""
        with self.get_session() as db:
            session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if not session:
                return None
            if title:
                session.title = title
            if message_count is not None:
                session.message_count = message_count
            if preview:
                session.preview = preview
            session.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(session)
            return session

    def delete_session(self, session_id: str) -> bool:
        """删除会话"""
        with self.get_session() as db:
            session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if not session:
                return False
            db.delete(session)
            db.commit()
            return True

    # ========== 消息相关 ==========

    def get_messages_by_session(self, session_id: str) -> List[MessageModel]:
        """获取会话的消息列表"""
        with self.get_session() as db:
            return db.query(MessageModel).filter(
                MessageModel.session_id == session_id
            ).order_by(MessageModel.created_at.asc()).all()

    def create_message(self, message_id: str, session_id: str, role: str, content: str) -> MessageModel:
        """创建消息"""
        with self.get_session() as db:
            message = MessageModel(
                id=message_id,
                session_id=session_id,
                role=role,
                content=content
            )
            db.add(message)
            db.commit()
            db.refresh(message)
            return message

    def delete_messages_by_session(self, session_id: str) -> bool:
        """删除会话的所有消息"""
        with self.get_session() as db:
            db.query(MessageModel).filter(MessageModel.session_id == session_id).delete()
            db.commit()
            return True


# 全局数据库服务实例
db_service = DatabaseService()
