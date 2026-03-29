"""Migrate existing sub-users from 'viewer' to 'editor' role (matches their actual create access)."""
import sys; sys.path.insert(0, '.')
from app.db.session import SessionLocal
from app.models.user import User

db = SessionLocal()
try:
    sub_users = db.query(User).filter(User.parent_user_id.isnot(None), User.role == 'viewer').all()
    for u in sub_users:
        u.role = 'editor'
        print(f'Updated {u.email} viewer -> editor')
    db.commit()
    print(f'Done. {len(sub_users)} sub-user(s) updated.')
finally:
    db.close()
