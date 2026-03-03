"""
数据库服务层
企业级数据库操作服务
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
import bcrypt
import uuid
import jwt

from config.database import DATABASE_URL, JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_HOURS
from models.database import Base, UserModel, SessionModel, MessageModel, WorkspaceFileModel


class DatabaseService:
    """数据库服务"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self.engine = create_engine(
            DATABASE_URL,
            poolclass=QueuePool,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=3600,
            echo=False
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    def create_tables(self):
        """创建所有表"""
        Base.metadata.create_all(bind=self.engine)

    def get_session(self) -> Session:
        """获取数据库会话"""
        return self.SessionLocal()

    # ========== 密码和认证相关 ==========

    @staticmethod
    def hash_password(password: str) -> str:
        """哈希密码"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """验证密码"""
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False

    @staticmethod
    def generate_token(user_id: str) -> str:
        """生成 JWT Token"""
        expire_time = datetime.utcnow().timestamp() + JWT_EXPIRE_HOURS * 3600
        payload = {
            "user_id": user_id,
            "exp": expire_time
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    @staticmethod
    def verify_token(token: str) -> Optional[str]:
        """验证 JWT Token，返回用户ID"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload.get("user_id")
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

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

    def create_user(self, username: str, password: str, name: str, role: str = "user") -> UserModel:
        """创建用户"""
        with self.get_session() as db:
            user_id = str(uuid.uuid4())
            password_hash = self.hash_password(password)
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

    def update_user_password(self, user_id: str, new_password: str) -> bool:
        """更新用户密码"""
        with self.get_session() as db:
            user = db.query(UserModel).filter(UserModel.id == user_id).first()
            if not user:
                return False
            user.password_hash = self.hash_password(new_password)
            db.commit()
            return True

    def delete_user(self, user_id: str) -> bool:
        """删除用户"""
        with self.get_session() as db:
            user = db.query(UserModel).filter(UserModel.id == user_id).first()
            if not user:
                return False
            db.delete(user)
            db.commit()
            return True

    def authenticate_user(self, username: str, password: str) -> Optional[UserModel]:
        """验证用户登录"""
        user = self.get_user_by_username(username)
        if not user:
            return None
        if not self.verify_password(password, user.password_hash):
            return None
        return user

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

    # ========== 工作区文件相关 ==========

    def get_files_by_session(self, session_id: str) -> List[WorkspaceFileModel]:
        """获取会话的文件列表"""
        with self.get_session() as db:
            return db.query(WorkspaceFileModel).filter(
                WorkspaceFileModel.session_id == session_id
            ).order_by(WorkspaceFileModel.created_at.desc()).all()

    def create_file(self, file_id: str, session_id: str, name: str, path: str, 
                   size: int = 0, extension: str = None, is_generated: bool = False) -> WorkspaceFileModel:
        """创建文件记录"""
        with self.get_session() as db:
            file = WorkspaceFileModel(
                id=file_id,
                session_id=session_id,
                name=name,
                path=path,
                size=size,
                extension=extension,
                is_generated=is_generated
            )
            db.add(file)
            db.commit()
            db.refresh(file)
            return file

    def delete_file(self, file_id: str) -> bool:
        """删除文件记录"""
        with self.get_session() as db:
            file = db.query(WorkspaceFileModel).filter(WorkspaceFileModel.id == file_id).first()
            if not file:
                return False
            db.delete(file)
            db.commit()
            return True

    def delete_file_by_path(self, session_id: str, path: str) -> bool:
        """根据路径删除文件记录"""
        with self.get_session() as db:
            file = db.query(WorkspaceFileModel).filter(
                WorkspaceFileModel.session_id == session_id,
                WorkspaceFileModel.path == path
            ).first()
            if not file:
                return False
            db.delete(file)
            db.commit()
            return True

    def delete_files_by_path_prefix(self, session_id: str, path_prefix: str) -> int:
        """删除指定路径前缀的所有文件记录（用于删除目录）"""
        with self.get_session() as db:
            # 使用 LIKE 匹配路径前缀
            pattern = f"{path_prefix}%"
            count = db.query(WorkspaceFileModel).filter(
                WorkspaceFileModel.session_id == session_id,
                WorkspaceFileModel.path.like(pattern)
            ).delete(synchronize_session=False)
            db.commit()
            return count

    def delete_files_by_session(self, session_id: str) -> bool:
        """删除会话的所有文件记录"""
        with self.get_session() as db:
            db.query(WorkspaceFileModel).filter(WorkspaceFileModel.session_id == session_id).delete()
            db.commit()
            return True

    # ========== 初始化 ==========

    def init_default_admin(self):
        """初始化默认管理员账户"""
        with self.get_session() as db:
            admin = db.query(UserModel).filter(UserModel.username == "admin").first()
            if not admin:
                password_hash = self.hash_password("admin123")
                admin = UserModel(
                    id=str(uuid.uuid4()),
                    username="admin",
                    password_hash=password_hash,
                    name="系统管理员",
                    role="admin"
                )
                db.add(admin)
                db.commit()
                print("✅ 已创建默认管理员账户: admin / admin123")
            else:
                print("✅ 管理员账户已存在")

    # ========== 补充方法 ==========

    def verify_token(self, token: str) -> Optional[str]:
        """验证JWT Token"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload.get("user_id")
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

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

    def create_user(self, username: str, password: str, name: str, role: str = "user") -> UserModel:
        """创建用户"""
        with self.get_session() as db:
            user_id = str(uuid.uuid4())
            password_hash = self.hash_password(password)
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

    def update_user_password(self, user_id: str, new_password: str) -> bool:
        """更新用户密码"""
        with self.get_session() as db:
            user = db.query(UserModel).filter(UserModel.id == user_id).first()
            if not user:
                return False
            user.password_hash = self.hash_password(new_password)
            db.commit()
            return True

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
