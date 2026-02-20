#!/usr/bin/env python
"""
Manual Database Reset Script
Ejecuta este script para resetear completamente la base de datos
"""
import os
import sys
from pathlib import Path

def reset_database():
    """Reset database schema"""
    print("=== AdminG Database Reset ===\n")
    
    # Delete existing database file
    db_file = Path("app.db")
    if db_file.exists():
        print(f"Deleting existing database: {db_file}")
        db_file.unlink()
        print("✓ Database deleted\n")
    else:
        print("No existing database found\n")
    
    # Create tables
    print("Creating new database schema...")
    try:
        from app.db.base import Base
        from app.db.session import engine
        
        Base.metadata.create_all(bind=engine)
        print("✓ Tables created successfully\n")
    except Exception as e:
        print(f"✗ Error creating tables: {e}")
        return False
    
    # Seed plans
    print("Seeding plans...")
    try:
        from app.db.session import SessionLocal
        from app.modules.plans.service import seed_plans
        
        db = SessionLocal()
        seed_plans(db)
        db.close()
        print("✓ Plans seeded successfully\n")
    except Exception as e:
        print(f"✗ Error seeding plans: {e}")
        return False
    
    print("=== Reset Complete ===")
    print("\n✓ Next step: Start the server with:")
    print("   cd app && python -m uvicorn main:app --reload\n")
    print("Or in Windows CMD:")
    print("   cd app && uvicorn main:app --reload\n")
    
    return True

if __name__ == "__main__":
    success = reset_database()
    sys.exit(0 if success else 1)
