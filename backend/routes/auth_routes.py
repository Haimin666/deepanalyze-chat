"""
认证路由定义
"""
from fastapi import APIRouter, Body, Depends, Header
from typing import Optional

from controllers.auth_controller import AuthController, UserController
from controllers.session_controller import SessionController
from models.workspace import LoginRequest, LoginResponse, User, SessionCreate, ChatSession


def create_auth_router() -> APIRouter:
    """创建认证路由"""
    router = APIRouter(prefix="/auth", tags=["Auth"])
    auth_controller = AuthController()

    @router.post("/login", response_model=LoginResponse)
    async def login(request: LoginRequest = Body(...)):
        """用户登录"""
        return await auth_controller.login(request)

    @router.post("/logout")
    async def logout(user: User = Depends(auth_controller.get_current_user)):
        """用户登出"""
        return await auth_controller.logout(user.id)

    @router.get("/me", response_model=User)
    async def get_me(user: User = Depends(auth_controller.get_current_user)):
        """获取当前用户信息"""
        return user

    @router.post("/change-password")
    async def change_password(
        old_password: str = Body(..., embed=True),
        new_password: str = Body(..., embed=True),
        user: User = Depends(auth_controller.get_current_user)
    ):
        """修改密码"""
        return await auth_controller.change_password(user.id, old_password, new_password)

    return router


def create_user_router() -> APIRouter:
    """创建用户管理路由"""
    router = APIRouter(prefix="/users", tags=["Users"])
    auth_controller = AuthController()
    user_controller = UserController()

    @router.get("")
    async def get_users(
        page: int = 1,
        limit: int = 10,
        search: str = "",
        user: User = Depends(auth_controller.get_current_user)
    ):
        """获取用户列表（需要管理员权限）"""
        if user.role != "admin":
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="需要管理员权限")
        return await user_controller.get_users(page, limit, search)

    @router.post("", response_model=User)
    async def create_user(
        username: str = Body(...),
        password: str = Body(...),
        name: str = Body(...),
        role: str = Body("user"),
        current_user: User = Depends(auth_controller.get_current_user)
    ):
        """创建用户（需要管理员权限）"""
        if current_user.role != "admin":
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="需要管理员权限")
        return await user_controller.create_user(username, password, name, role)

    @router.put("/{user_id}", response_model=User)
    async def update_user(
        user_id: str,
        name: str = Body(None),
        username: str = Body(None),
        role: str = Body(None),
        current_user: User = Depends(auth_controller.get_current_user)
    ):
        """更新用户（需要管理员权限）"""
        if current_user.role != "admin":
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="需要管理员权限")
        return await user_controller.update_user(user_id, name, username, role)

    @router.delete("/{user_id}")
    async def delete_user(
        user_id: str,
        current_user: User = Depends(auth_controller.get_current_user)
    ):
        """删除用户（需要管理员权限）"""
        if current_user.role != "admin":
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="需要管理员权限")
        return await user_controller.delete_user(user_id)

    @router.post("/{user_id}/reset-password")
    async def reset_password(
        user_id: str,
        new_password: str = Body(..., embed=True),
        current_user: User = Depends(auth_controller.get_current_user)
    ):
        """重置用户密码（需要管理员权限）"""
        if current_user.role != "admin":
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="需要管理员权限")
        return await user_controller.reset_password(user_id, new_password)

    return router


def create_session_router() -> APIRouter:
    """创建会话管理路由"""
    router = APIRouter(prefix="/sessions", tags=["Sessions"])
    auth_controller = AuthController()
    session_controller = SessionController()

    @router.get("")
    async def get_sessions(user: User = Depends(auth_controller.get_current_user)) -> list[ChatSession]:
        """获取用户的会话列表"""
        return await session_controller.get_sessions(user.id)

    @router.post("", response_model=ChatSession)
    async def create_session(
        data: SessionCreate = Body(...),
        user: User = Depends(auth_controller.get_current_user)
    ):
        """创建新会话"""
        return await session_controller.create_session(user.id, data)

    @router.get("/{session_id}", response_model=ChatSession)
    async def get_session(
        session_id: str,
        user: User = Depends(auth_controller.get_current_user)
    ):
        """获取会话详情"""
        return await session_controller.get_session(session_id, user.id)

    @router.put("/{session_id}", response_model=ChatSession)
    async def update_session(
        session_id: str,
        title: str = Body(None),
        preview: str = Body(None),
        user: User = Depends(auth_controller.get_current_user)
    ):
        """更新会话"""
        return await session_controller.update_session(session_id, user.id, title=title, preview=preview)

    @router.delete("/{session_id}")
    async def delete_session(
        session_id: str,
        user: User = Depends(auth_controller.get_current_user)
    ):
        """删除会话"""
        return await session_controller.delete_session(session_id, user.id)

    @router.get("/{session_id}/messages")
    async def get_messages(
        session_id: str,
        user: User = Depends(auth_controller.get_current_user)
    ):
        """获取会话的消息列表"""
        return await session_controller.get_messages(session_id, user.id)

    @router.post("/{session_id}/messages")
    async def save_message(
        session_id: str,
        role: str = Body(...),
        content: str = Body(...),
        user: User = Depends(auth_controller.get_current_user)
    ):
        """保存消息到会话"""
        return await session_controller.save_message(session_id, user.id, role, content)

    @router.post("/{session_id}/messages/batch")
    async def save_messages_batch(
        session_id: str,
        messages: list = Body(...),
        user: User = Depends(auth_controller.get_current_user)
    ):
        """批量保存消息"""
        return await session_controller.save_messages_batch(session_id, user.id, messages)

    return router
