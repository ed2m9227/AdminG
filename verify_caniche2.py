#!/usr/bin/env python
"""Verify or create caniche2@example.com account with basic plan"""
import sys
import os

# Ensure proper imports
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

from app.db.session import engine
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import hash_password

db = Session(bind=engine)

try:
    # Check if user exists
    user = db.query(User).filter(User.email == 'caniche2@example.com').first()
    
    if user:
        print(f"✓ User found")
        print(f"  Email: {user.email}")
        print(f"  Plan: {user.plan}")
        print(f"  Role: {user.role}")
        print(f"  ID: {user.id}")
        
        # Update plan to basic if needed
        if user.plan != 'AdminG_Basic':
            print(f"\n⚠ Updating plan from '{user.plan}' to 'AdminG_Basic'")
            user.plan = 'AdminG_Basic'
            db.commit()
            print("✓ Plan updated")
    else:
        print("✗ User not found, creating...")
        new_user = User(
            email='caniche2@example.com',
            hashed_password=hash_password('password123'),
            full_name='Caniche Test',
            plan='AdminG_Basic',
            role='admin',
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(f"✓ User created")
        print(f"  Email: {new_user.email}")
        print(f"  Plan: {new_user.plan}")
        print(f"  Role: {new_user.role}")
        print(f"  ID: {new_user.id}")
        
finally:
    db.close()
