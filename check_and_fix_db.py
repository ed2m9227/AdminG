#!/usr/bin/env python
"""Check database schema and apply migrations if needed"""
import os
from sqlalchemy import inspect, create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.session import SessionLocal, engine

# Check current schema
print("\n=== Checking Database Schema ===")
inspector = inspect(engine)

if 'inventory_items' in inspector.get_table_names():
    columns = inspector.get_columns('inventory_items')
    column_names = [col['name'] for col in columns]
    print(f"\n✓ inventory_items table exists with columns:")
    for col in columns:
        print(f"  - {col['name']}: {col['type']}")
    
    if 'item_type' not in column_names:
        print("\n⚠️  Missing 'item_type' column. Running migration...")
        from alembic.config import Config
        from alembic.command import upgrade
        
        alembic_cfg = Config("alembic.ini")
        upgrade(alembic_cfg, "head")
        print("✓ Migration applied!")
    else:
        print("\n✓ item_type column already exists!")
else:
    print("\n✗ inventory_items table not found!")

# Verify after migration
print("\n=== Verifying After Migration ===")
inspector = inspect(engine)
columns = inspector.get_columns('inventory_items')
column_names = [col['name'] for col in columns]
print(f"Columns in inventory_items: {column_names}")

if 'item_type' in column_names:
    print("✅ SUCCESS: item_type column is now present!")
else:
    print("❌ FAILED: item_type column is still missing!")
