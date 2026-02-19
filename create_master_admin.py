"""Create or update the master admin account."""
from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.user import User
from app.core.security import hash_password


def create_master_admin(email: str, password: str):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.hashed_password = hash_password(password)
            user.role = "admin"
            user.plan = "admin"
            user.is_active = True
            db.commit()
            db.refresh(user)
            return user, "updated"

        user = User(
            email=email,
            hashed_password=hash_password(password),
            role="admin",
            plan="admin",
            is_active=True,
            business_type="master",
            parent_user_id=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user, "created"
    finally:
        db.close()


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python create_master_admin.py <email> <password>")
        raise SystemExit(1)

    email = sys.argv[1]
    password = sys.argv[2]

    user, action = create_master_admin(email, password)
    print(f"Master admin {action}: {user.email}")
