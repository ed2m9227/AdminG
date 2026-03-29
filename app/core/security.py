from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from app.db.session import get_db
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.config import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# Use bcrypt for now (argon2 has backend issues)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password using argon2 (no 72-byte limit)"""
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(password, hashed)

def create_access_token(data: dict, expires_minutes: int = 60):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        plan = payload.get("plan")

        if not user_id or not role or not plan:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
            )

        return {
                "id": user_id,
                "role": role,
                "plan": plan
            }

    except JWTError:
        raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials"
                )

def get_current_user_with_plan_check(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    """Get current user and check if plan is expired"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        # Check plan expiration (30 days) - Auto-renew plan
        if user.plan != "free" and user.plan_start_date:
            expiration_date = user.plan_start_date + timedelta(days=30)
            if datetime.utcnow() > expiration_date:
                # Auto-renew plan for another 30 days
                user.plan_start_date = datetime.utcnow()
                db.add(user)
                db.commit()

        return {
            "id": str(user.id),
            "role": user.role,
            "plan": user.plan
        }

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
