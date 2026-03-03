"""
健康检查路由
"""
from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "deepanalyze-backend"}
