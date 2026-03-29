#!/usr/bin/env python
"""Initialize database using actual app models"""
import sys
import os

# Ensure proper imports
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

print("[*] Initializing database with actual models...")

try:
    from app.db.base import Base
    from app.db.session import engine
    
    # Import all models to register them
    from app.models import (
        User, Customer, Pet, BusinessConfiguration,
        Service, Appointment, Payment, Plan, PlanLimit, PlanFeature,
        InventoryItem, InventoryCategory, InventoryMovement, TeamUser
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("[OK] All tables created!")
    
    print("\nTables created:")
    for table_name in sorted(Base.metadata.tables.keys()):
        print(f"  - {table_name}")
    
    # Create admin user
    from sqlalchemy.orm import Session
    from app.core.security import hash_password
    
    db = Session(bind=engine)
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.email == 'admin@admingpro.com').first()
        if not admin:
            admin = User(
                email='admin@admingpro.com',
                hashed_password=hash_password('adminpass123'),
                role='admin',
                plan='max',
                is_active=True,
                business_type='veterinaria'
            )
            db.add(admin)
            db.commit()
            print("[OK] Admin user created!")
            print(f"   Email: admin@admingpro.com")
            print(f"   Password: adminpass123")
        else:
            print("[OK] Admin user already exists")
    finally:
        db.close()
    
    print("\n[OK] DATABASE INITIALIZATION COMPLETE!")
    sys.exit(0)
    
except Exception as e:
    import traceback
    print(f"\n[ERROR] Error: {e}")
    print("\nFull traceback:")
    traceback.print_exc()
    sys.exit(1)
