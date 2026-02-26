from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_admin_user
from schemas.schemas import UserCreate, UserResponse
from services import user_service

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/users", response_model=list[UserResponse])
def read_users(db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    return user_service.get_users(db)

@router.post("/users", response_model=UserResponse)
def add_user(user: UserCreate, db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    return user_service.create_user(db, user)

@router.delete("/users/{user_id}")
def remove_user(user_id: int, db: Session = Depends(get_db), admin=Depends(get_admin_user)):
    user_service.delete_user(db, user_id)
    return {"msg": "用户已删除"}