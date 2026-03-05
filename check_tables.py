from app.db.session import engine
import sqlalchemy

inspector = sqlalchemy.inspect(engine)
tables = inspector.get_table_names()

print("\n=== TABLAS EN LA BASE DE DATOS ===")
for table in sorted(tables):
    print(f"  ✓ {table}")

print(f"\n=== VERIFICACIÓN ===")
if 'cash_transactions' in tables:
    print("✅ cash_transactions EXISTE")
else:
    print("❌ cash_transactions NO EXISTE")

print(f"\nTotal de tablas: {len(tables)}")
