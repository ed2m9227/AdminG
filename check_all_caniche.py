from app.db.session import SessionLocal
from app.models.user import User

db = SessionLocal()

# Buscar usuarios caniche
users = db.query(User).filter(User.email.like('%caniche%')).all()

print('\n=== Usuarios Caniche ===')
for user in users:
    print(f'\nEmail: {user.email}')
    print(f'  ID: {user.id}')
    print(f'  Role: {user.role}')
    print(f'  Plan: {user.plan}')
    print(f'  parent_user_id: {user.parent_user_id}')
    print(f'  onboarding_completed: {user.onboarding_completed}')

db.close()
