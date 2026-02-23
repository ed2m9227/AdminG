"""
Quick Reset - Auto confirms
"""
import sys
sys.path.insert(0, '.')

from reset_and_seed import *

if __name__ == "__main__":
    print("="*60)
    print("AdminG Quick Reset (Auto-confirmed)")
    print("="*60)
    
    # Reset database
    reset_database()
    
    # Create session
    from app.db.session import SessionLocal
    db = SessionLocal()
    
    try:
        # Seed data
        seed_business_types(db)
        create_admin_user(db)
        create_test_user(db)
        
        print("\n" + "="*60)
        print("✅ Database reset and seeded successfully!")
        print("="*60)
        print("\nYou can now login with:")
        print("  - admin@adminsystems.com / admin123")
        print("  - caniche2@example.com / caniche2")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()
