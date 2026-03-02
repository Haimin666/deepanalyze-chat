"""
数据模型定义
"""
from typing import Optional, List
from pydantic import BaseModel
from dataclasses import dataclass
from datetime import datetime


# ========== 工作区模型 ==========

@dataclass
class WorkspaceFile:
    """工作区文件模型"""
    name: str
    size: int
    extension: str
    icon: str
    download_url: str
    preview_url: Optional[str] = None


@dataclass
class WorkspaceNode:
    """工作区树节点模型"""
    name: str
    path: str
    is_dir: bool
    size: Optional[int] = None
    extension: Optional[str] = None
    icon: Optional[str] = None
    download_url: Optional[str] = None
    children: Optional[List['WorkspaceNode']] = None


# ========== 用户模型 ==========

class UserBase(BaseModel):
    """用户基础模型"""
    username: str
    name: str
    role: str = "user"


class UserCreate(UserBase):
    """创建用户模型"""
    password: str


class User(UserBase):
    """用户完整模型"""
    id: str
    createdAt: str


class UserInDB(User):
    """数据库中的用户模型（包含密码）"""
    password: str


# ========== 会话模型 ==========

class ChatSession(BaseModel):
    """聊天会话模型"""
    id: str
    title: str
    createdAt: str
    updatedAt: str
    messageCount: int
    preview: Optional[str] = None


class SessionCreate(BaseModel):
    """创建会话模型"""
    id: Optional[str] = None
    title: Optional[str] = None
    messages: Optional[List[dict]] = None
    preview: Optional[str] = None


# ========== 聊天模型 ==========

class ChatMessage(BaseModel):
    """聊天消息模型"""
    role: str
    content: str


class ChatRequest(BaseModel):
    """聊天请求模型"""
    messages: List[ChatMessage]
    workspace: Optional[List[str]] = None
    session_id: str = "default"


# ========== 代码执行模型 ==========

class CodeExecuteRequest(BaseModel):
    """代码执行请求模型"""
    code: str
    session_id: str = "default"


class CodeExecuteResponse(BaseModel):
    """代码执行响应模型"""
    success: bool
    result: str
    message: str


# ========== 报告导出模型 ==========

class ExportReportRequest(BaseModel):
    """导出报告请求模型"""
    messages: List[dict]
    title: Optional[str] = None
    session_id: str = "default"


# ========== 认证模型 ==========

class LoginRequest(BaseModel):
    """登录请求模型"""
    username: str
    password: str


class LoginResponse(BaseModel):
    """登录响应模型"""
    success: bool
    user: Optional[User] = None
    token: Optional[str] = None
