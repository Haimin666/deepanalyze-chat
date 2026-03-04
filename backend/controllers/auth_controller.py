"""
认证控制器
处理用户登录、注册、Token验证等
支持Token黑名单，退出登录时Token立即失效
"""
from typing import Optional
from fastapi import HTTPException, Header
from datetime import datetime

from services.database_service import db_service
from models.workspace import User, LoginRequest, LoginResponse


class AuthController:
    """认证控制器"""

    async def login(self, request: LoginRequest) -> LoginResponse:
        """用户登录"""
        user = db_service.authenticate_user(request.username, request.password)
        if not user:
            raise HTTPException(status_code=401, detail="用户名或密码错误")
        
        token = db_service.generate_token(user.id)
        
        return LoginResponse(
            success=True,
            user=User(
                id=user.id,
                username=user.username,
                name=user.name,
                role=user.role,
                createdAt=user.created_at.isoformat() + "Z" if user.created_at else ""
            ),
            token=token
        )

    async def get_current_user(self, authorization: Optional[str] = Header(None)) -> User:
        """获取当前登录用户"""
        if not authorization:
            raise HTTPException(status_code=401, detail="未提供认证Token")
        
        # 支持 Bearer token 格式
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization
        
        user_id = db_service.verify_token(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Token无效或已过期")
        
        user = db_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="用户不存在")
        
        return User(
            id=user.id,
            username=user.username,
            name=user.name,
            role=user.role,
            createdAt=user.created_at.isoformat() + "Z" if user.created_at else ""
        )

    async def logout(self, user: User, authorization: Optional[str] = Header(None)) -> dict:
        """用户登出 - 将token加入黑名单使其立即失效"""
        # 获取token
        token = None
        if authorization:
            if authorization.startswith("Bearer "):
                token = authorization[7:]
            else:
                token = authorization
        
        # 将token加入黑名单
        if token:
            db_service.add_token_to_blacklist(token, user.id, "logout")
        
        return {"success": True, "message": "已退出登录，Token已失效"}


class UserController:
    """用户管理控制器"""

    async def get_users(self, page: int = 1, limit: int = 10, search: str = "") -> dict:
        """获取用户列表"""
        users, total = db_service.get_users(page=page, limit=limit, search=search)
        return {
            "users": [
                User(
                    id=u.id,
                    username=u.username,
                    name=u.name,
                    role=u.role,
                    createdAt=u.created_at.isoformat() + "Z" if u.created_at else ""
                ) for u in users
            ],
            "total": total,
            "page": page,
            "limit": limit
        }

    async def create_user(self, username: str, password: str, name: str, role: str = "user") -> User:
        """创建用户"""
        # 检查用户名是否已存在
        existing = db_service.get_user_by_username(username)
        if existing:
            raise HTTPException(status_code=400, detail="用户名已存在")
        
        user = db_service.create_user(
            username=username,
            password=password,
            name=name,
            role=role
        )
        return User(
            id=user.id,
            username=user.username,
            name=user.name,
            role=user.role,
            createdAt=user.created_at.isoformat() + "Z" if user.created_at else ""
        )

    async def update_user(self, user_id: str, name: str = None, username: str = None, role: str = None) -> User:
        """更新用户"""
        user = db_service.update_user(user_id, name=name, username=username, role=role)
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        return User(
            id=user.id,
            username=user.username,
            name=user.name,
            role=user.role,
            createdAt=user.created_at.isoformat() + "Z" if user.created_at else ""
        )

    async def delete_user(self, user_id: str) -> dict:
        """删除用户"""
        success = db_service.delete_user(user_id)
        if not success:
            raise HTTPException(status_code=404, detail="用户不存在")
        return {"success": True, "message": "用户已删除"}

    async def reset_password(self, user_id: str, new_password: str) -> dict:
        """重置用户密码"""
        success = db_service.update_user_password(user_id, new_password)
        if not success:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 撤销该用户的所有token（强制重新登录）
        db_service.revoke_all_user_tokens(user_id, "password_reset")
        
        return {"success": True, "message": "密码已重置，用户需重新登录"}
