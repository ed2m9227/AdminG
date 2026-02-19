"""
Script to create admin user with Max plan
"""
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password

def create_admin():
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing = db.query(User).filter(User.email == "admin@admingpro.com").first()
        
        if existing:
            print(f"⚠️  Admin user already exists with:")
            print(f"   Email: {existing.email}")
            print(f"   Role: {existing.role}")
            print(f"   Plan: {existing.plan}")
            print(f"\n🗑️  Deleting old admin...")
            db.delete(existing)
            db.commit()
            print("✅ Old admin deleted")
        
        # Create new admin
        admin = User(
            email="admin@admingpro.com",
            hashed_password=hash_password("admin123"),  # Change this password!
            role="admin",
            plan="max",
            is_active=True,
            business_type="general"
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("\n✅ Admin user created successfully!")
        print(f"   Email: {admin.email}")
        print(f"   Password: admin123")
        print(f"   Role: {admin.role}")
        print(f"   Plan: {admin.plan}")
        print(f"   ID: {admin.id}")
        print("\n⚠️  IMPORTANT: Change the password after first login!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
