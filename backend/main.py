import threading
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import engine, Base, SessionLocal
from core.security import get_password_hash
from models.models import User
from services.workspace_service import start_http_server

# 初始化数据库与默认 Admin 账号
Base.metadata.create_all(bind=engine)
db = SessionLocal()
if not db.query(User).filter(User.username == "admin").first():
    db.add(User(username="admin", hashed_password=get_password_hash("admin123"), role="admin"))
    db.commit()
db.close()

app = FastAPI(title="DeepAnalyze API")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# 注册各分层路由
from api import auth, admin, workspace, chat
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(workspace.router)
app.include_router(chat.router)

# 独立线程拉起静态文件服务器
threading.Thread(target=start_http_server, daemon=True).start()

if __name__ == "__main__":
    print("🚀 启动分层后端服务...")
    print(f"   - API服务: http://localhost:8200")
    print(f"   - 文件服务: http://localhost:8100")
    uvicorn.run(app, host="0.0.0.0", port=8200)