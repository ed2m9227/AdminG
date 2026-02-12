from sqlalchemy.orm import Session
from app.core.security import hash_password, verify_password
from app.models.user import User

def create_user(email: str, password: str, role: str = "viewer", plan: str = "free", db: Session = None):
    """Create a new user in database"""
    if not db:
        raise ValueError("Database session required")
    
    # Check if user exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        return None
    
    user = User(
        email=email,
        hashed_password=hash_password(password),
        role=role,
        plan=plan,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(email: str, password: str, db: Session):
    """Authenticate user with email and password"""
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
