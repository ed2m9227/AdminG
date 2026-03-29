#!/usr/bin/env python3
"""Quick script to add missing columns to database"""
import sqlite3
import os

db_path = "app.db"

if not os.path.exists(db_path):
    print(f"Database {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Add columns to payments table
    print("Adding columns to payments table...")
    cursor.execute("ALTER TABLE payments ADD COLUMN service_id INTEGER")
    print("  ✓ Added service_id")
    cursor.execute("ALTER TABLE payments ADD COLUMN service_package_id INTEGER")
    print("  ✓ Added service_package_id")
    cursor.execute("ALTER TABLE payments ADD COLUMN concept VARCHAR(200)")
    print("  ✓ Added concept")
    
    # Add columns to appointments table
    print("Adding columns to appointments table...")
    cursor.execute("ALTER TABLE appointments ADD COLUMN service_package_id INTEGER")
    print("  ✓ Added service_package_id")
    
    conn.commit()
    print("\n✅ Database updated successfully!")
    
except sqlite3.OperationalError as e:
    if "already exists" in str(e):
        print(f"⚠️  Columns probably already exist: {e}")
    else:
        print(f"❌ Error: {e}")
        conn.rollback()
finally:
    conn.close()
