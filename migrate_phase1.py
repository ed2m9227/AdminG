"""
Migration Script: Phase 1 Consolidation
Centraliza Pagos, Caja e Items

Cambios:
1. Tabla payments: Agregar invoice_id FK
2. Tabla cash_transactions: Agregar payment_id FK
3. Nueva tabla payment_items: Desglose de items en pagos
"""

import sqlite3
from datetime import datetime
import sys

def migrate_phase1():
    """Ejecutar migración Phase 1"""
    db_file = "app.db"
    
    try:
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        
        print("[1/3] Agregando invoice_id a payments...")
        try:
            cursor.execute("""
                ALTER TABLE payments ADD COLUMN invoice_id INTEGER 
                REFERENCES invoices(id) ON DELETE SET NULL
            """)
            conn.commit()
            print("✓ invoice_id agregado a payments")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("✓ invoice_id ya existe en payments")
            else:
                raise
        
        print("[2/3] Agregando payment_id a cash_transactions...")
        try:
            cursor.execute("""
                ALTER TABLE cash_transactions ADD COLUMN payment_id INTEGER 
                REFERENCES payments(id) ON DELETE SET NULL
            """)
            conn.commit()
            print("✓ payment_id agregado a cash_transactions")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("✓ payment_id ya existe en cash_transactions")
            else:
                raise
        
        print("[3/3] Creando tabla payment_items...")
        try:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS payment_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
                    source_type VARCHAR(20) NOT NULL,
                    service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
                    inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
                    description VARCHAR(255) NOT NULL,
                    quantity NUMERIC(10, 2) DEFAULT 1,
                    unit_price NUMERIC(10, 2) NOT NULL,
                    subtotal NUMERIC(10, 2) NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            print("✓ Tabla payment_items creada")
        except sqlite3.OperationalError as e:
            if "already exists" in str(e):
                print("✓ Tabla payment_items ya existe")
            else:
                raise
        
        # Crear índices para performance
        print("\nCreando índices...")
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cash_transactions_payment ON cash_transactions(payment_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_payment_items_payment ON payment_items(payment_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_payment_items_service ON payment_items(service_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_payment_items_inventory ON payment_items(inventory_item_id)")
            conn.commit()
            print("✓ Índices creados")
        except sqlite3.OperationalError as e:
            print(f"⚠ Error creando índices: {e}")
        
        conn.close()
        print("\n✅ Migración Phase 1 completada exitosamente")
        return True
        
    except Exception as e:
        print(f"\n❌ Error en migración: {e}")
        return False


if __name__ == "__main__":
    success = migrate_phase1()
    sys.exit(0 if success else 1)
