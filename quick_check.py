"""Verificar planes rápido"""
import sqlite3

conn = sqlite3.connect('app.db')
cursor = conn.cursor()

print("\n=== USUARIOS POR PLAN ===")
cursor.execute("SELECT plan, COUNT(*) FROM users GROUP BY plan")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]} usuarios")

print("\n=== PLANES DISPONIBLES ===")
cursor.execute("SELECT name, display_name, price FROM plans")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]} - ${row[2]:,.0f} COP")

conn.close()
print("\n" + "="*50)
