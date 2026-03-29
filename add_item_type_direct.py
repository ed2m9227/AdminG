#!/usr/bin/env python
"""
Script para agregar columna item_type a inventory_items
Ejecutar: python add_item_type_direct.py
"""
import sqlite3
import os

DB_PATH = "app/db/admin_g.db"

def add_item_type_column():
    """Agregar columna item_type a inventory_items"""
    if not os.path.exists(DB_PATH):
        print(f"❌ Base de datos no encontrada en {DB_PATH}")
        return False
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verificar si la columna ya existe
        cursor.execute("PRAGMA table_info(inventory_items)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'item_type' in columns:
            print("✅ Column 'item_type' already exists in inventory_items")
            conn.close()
            return True
        
        # Agregar la columna con valor por defecto 'product'
        cursor.execute("""
            ALTER TABLE inventory_items 
            ADD COLUMN item_type VARCHAR(20) NOT NULL DEFAULT 'product'
        """)
        
        conn.commit()
        print("✅ Column 'item_type' added to inventory_items with default value 'product'")
        
        # Verificar
        cursor.execute("PRAGMA table_info(inventory_items)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"📊 Current columns: {columns}")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = add_item_type_column()
    exit(0 if success else 1)
