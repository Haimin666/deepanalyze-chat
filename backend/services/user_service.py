"""
用户服务层
"""
from typing import Optional, List, Dict
from datetime import datetime
from copy import deepcopy

from config.settings import PRESET_USERS
from models.workspace import User, UserInDB


class UserService:
    """用户服务"""

    def __init__(self):
        # 模拟数据库 - 只包含 admin 用户
        self._users_db: Dict[str, UserInDB] = {
            u["id"]: UserInDB(**u) for u in deepcopy(PRESET_USERS)
        }

    def authenticate(self, username: str, password: str) -> Optional[User]:
        """验证用户登录 - 使用用户名"""
        for user in self._users_db.values():
            if user.username == username and user.password == password:
                return User(
                    id=user.id,
                    username=user.username,
                    name=user.name,
                    role=user.role,
                    createdAt=user.createdAt,
                )
        return None

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """通过ID获取用户"""
        user = self._users_db.get(user_id)
        if user:
            return User(
                id=user.id,
                username=user.username,
                name=user.name,
                role=user.role,
                createdAt=user.createdAt,
            )
        return None

    def get_user_by_username(self, username: str) -> Optional[User]:
        """通过用户名获取用户"""
        for user in self._users_db.values():
            if user.username == username:
                return User(
                    id=user.id,
                    username=user.username,
                    name=user.name,
                    role=user.role,
                    createdAt=user.createdAt,
                )
        return None

    def get_users(
        self,
        page: int = 1,
        limit: int = 10,
        search: str = ""
    ) -> tuple[List[User], int]:
        """获取用户列表"""
        users = [
            User(
                id=u.id,
                username=u.username,
                name=u.name,
                role=u.role,
                createdAt=u.createdAt,
            )
            for u in self._users_db.values()
        ]

        # 搜索过滤
        if search:
            search_lower = search.lower()
            users = [
                u for u in users
                if search_lower in u.name.lower()
                or search_lower in u.username.lower()
            ]

        # 排序
        users.sort(key=lambda x: x.createdAt, reverse=True)

        # 分页
        total = len(users)
        start = (page - 1) * limit
        end = start + limit

        return users[start:end], total

    def create_user(
        self,
        name: str,
        username: str,
        password: str,
        role: str = "user"
    ) -> User:
        """创建用户"""
        # 检查用户名是否已存在
        if self.get_user_by_username(username):
            raise ValueError("用户名已存在")

        user_id = str(int(datetime.now().timestamp() * 1000))
        now = datetime.now().isoformat() + "Z"

        user = UserInDB(
            id=user_id,
            username=username,
            name=name,
            role=role,
            password=password,
            createdAt=now,
        )
        self._users_db[user_id] = user

        return User(
            id=user.id,
            username=user.username,
            name=user.name,
            role=user.role,
            createdAt=user.createdAt,
        )

    def update_user(
        self,
        user_id: str,
        name: str = None,
        username: str = None,
        role: str = None
    ) -> Optional[User]:
        """更新用户"""
        user = self._users_db.get(user_id)
        if not user:
            return None

        if name:
            user.name = name
        if username:
            user.username = username
        if role:
            user.role = role

        return User(
            id=user.id,
            username=user.username,
            name=user.name,
            role=user.role,
            createdAt=user.createdAt,
        )

    def delete_user(self, user_id: str) -> bool:
        """删除用户"""
        if user_id not in self._users_db:
            return False

        # 不允许删除唯一的管理员
        admin_count = sum(1 for u in self._users_db.values() if u.role == "admin")
        if self._users_db[user_id].role == "admin" and admin_count <= 1:
            raise ValueError("不能删除唯一的管理员")

        del self._users_db[user_id]
        return True


class SessionService:
    """会话历史服务"""

    def __init__(self):
        # 模拟会话存储
        self._sessions: Dict[str, dict] = {}

    def get_sessions(self, user_id: str) -> List[dict]:
        """获取用户的会话列表"""
        sessions = [
            s for s in self._sessions.values()
            if s.get("user_id") == user_id or not s.get("user_id")
        ]
        sessions.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
        return sessions

    def save_session(
        self,
        session_id: str,
        title: str = None,
        messages: List[dict] = None,
        preview: str = None,
        user_id: str = None
    ) -> dict:
        """保存会话"""
        now = datetime.now().isoformat() + "Z"

        if session_id in self._sessions:
            session = self._sessions[session_id]
            if title:
                session["title"] = title
            if messages:
                session["messageCount"] = len(messages)
            if preview:
                session["preview"] = preview
            session["updatedAt"] = now
        else:
            session = {
                "id": session_id,
                "title": title or "新会话",
                "createdAt": now,
                "updatedAt": now,
                "messageCount": len(messages) if messages else 0,
                "preview": preview or "",
                "user_id": user_id,
            }
            self._sessions[session_id] = session

        return session

    def delete_session(self, session_id: str) -> bool:
        """删除会话"""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False
