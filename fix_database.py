#!/usr/bin/env python
"""
Fix database schema - Recreate with new models
"""
import os
import sys
from pathlib import Path

# Add project to path
sys.path.insert(0, str(Path(__file__).parent))

def fix_database():
    """Recreate database with all new models"""
    print("🔧 Fixing database schema...")
    
    # Remove old database
    db_file = Path("app.db")
    if db_file.exists():
        db_file.unlink()
        print("  ✅ Removed old database")
    
    # Import and create all tables
    try:
        from app.db.base import Base
        from app.db.session import engine
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("  ✅ Created all tables with proper schema")
        
        # Seed initial data
        from app.db.session import SessionLocal
        from app.modules.plans.service import seed_plans
        
        db = SessionLocal()
        try:
            seed_plans(db)
            print("  ✅ Seeded initial plans")
        finally:
            db.close()
        
        print("\n✅ Database fixed successfully!")
        print("   You can now register and login normally")
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = fix_database()
    sys.exit(0 if success else 1)
