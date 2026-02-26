from sqlalchemy.orm import Session
from models.models import Message, ChatSession

def ensure_session(db: Session, session_id: str, title: str = "新会话"):
    if not db.query(ChatSession).filter(ChatSession.session_id == session_id).first():
        db.add(ChatSession(session_id=session_id, title=title))
        db.commit()

def save_message(db: Session, session_id: str, role: str, content: str):
    db.add(Message(session_id=session_id, role=role, content=content))
    db.commit()

def enforce_message_limit(db: Session, session_id: str, max_limit: int = 50):
    total = db.query(Message).filter(Message.session_id == session_id).count()
    if total > max_limit:
        overflow = total - max_limit
        oldest = db.query(Message).filter(Message.session_id == session_id).order_by(Message.id.asc()).limit(overflow).all()
        for msg in oldest:
            db.delete(msg)
        db.commit()