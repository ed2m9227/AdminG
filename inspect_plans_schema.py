"""Verificar esquema de tabla plans"""
import sqlite3

conn = sqlite3.connect('app.db')
cursor = conn.cursor()

# Ver esquema de tabla plans
cursor.execute("PRAGMA table_info(plans)")
columns = cursor.fetchall()

print("Columnas de tabla 'plans':")
for col in columns:
    print(f"  {col[1]} ({col[2]}): nullable={col[3] == 0}, default={col[4]}")

conn.close()
