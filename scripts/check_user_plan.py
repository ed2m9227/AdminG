from app.db.session import SessionLocal
from app.models.user import User

db = SessionLocal()
u = db.query(User).filter(User.email=='caniche1@example.com').first()
if u:
    print('found plan', u.plan, 'role', u.role)
else:
    print('user not found')
