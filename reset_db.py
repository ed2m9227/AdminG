#!/usr/bin/env python
"""
Reset database - simple and direct
"""
import os
import sqlite3
from pathlib import Path

# Step 1: Delete old database
db_path = Path("app.db")
if db_path.exists():
    db_path.unlink()
    print("✅ Old database deleted")

# Step 2: Create fresh database with schema
try:
    from app.db.base import Base
    from app.db.session import engine
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database recreated with all tables")
    
    # Step 3: Seed plans
    from app.db.session import SessionLocal
    from app.modules.plans.service import seed_plans
    
    db = SessionLocal()
    seed_plans(db)
    db.close()
    print("✅ Plans seeded")
    print("\n🎉 Database ready! You can now register.")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
