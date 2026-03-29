from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    # Add column
    print('Adding onboarding_completed column...')
    db.execute(text("""
        ALTER TABLE users 
        ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT 0
    """))
    
    # Update admins
    print('Updating admin users...')
    db.execute(text("""
        UPDATE users 
        SET onboarding_completed = 1 
        WHERE role = 'admin'
    """))
    
    # Update sub-users
    print('Updating sub-users...')
    db.execute(text("""
        UPDATE users 
        SET onboarding_completed = 1 
        WHERE parent_user_id IS NOT NULL
    """))
    
    db.commit()
    print('✅ Migration completed successfully')
    
except Exception as e:
    db.rollback()
    print(f'❌ Error: {e}')
finally:
    db.close()
