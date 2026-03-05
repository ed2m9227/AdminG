from app.db.session import SessionLocal
from app.models.user import User
from sqlalchemy import inspect

db = SessionLocal()

# Check if onboarding_completed column exists
inspector = inspect(db.bind)
columns = [col['name'] for col in inspector.get_columns('users')]

print('Columns in users table:')
for col in columns:
    print(f'  - {col}')

if 'onboarding_completed' in columns:
    print('\n✅ onboarding_completed column exists')
    
    # Check some users
    users = db.query(User).limit(5).all()
    print('\nSample users:')
    for u in users:
        print(f'  {u.email}: onboarding_completed={u.onboarding_completed}, parent_user_id={u.parent_user_id}')
else:
    print('\n❌ onboarding_completed column does NOT exist - migration needed')

db.close()
