"""
Script simple para migrar planes - solo SQLite3
"""
import sqlite3

def migrate():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    print("\n" + "="*60)
    print("  MIGRACION DE PLANES")
    print("="*60)
    
    # 1. Actualizar usuarios
    print("\nActualizando usuarios...")
    
    cursor.execute("UPDATE users SET plan = 'max' WHERE plan IN ('AdminPro_Max', 'plus', 'admin')")
    print(f"  - Usuarios a MAX: {cursor.rowcount}")
    
    cursor.execute("UPDATE users SET plan = 'pro' WHERE plan IN ('AdminPro_Start', 'start')")
    print(f"  - Usuarios a PRO: {cursor.rowcount}")
    
    cursor.execute("UPDATE users SET plan = 'starter' WHERE plan IN ('AdminG_Basic', 'AdminG_Plus', 'basic')")
    print(f"  - Usuarios a STARTER: {cursor.rowcount}")
    
    cursor.execute("UPDATE users SET plan = 'free' WHERE plan NOT IN ('free', 'starter', 'pro', 'max') OR plan IS NULL")
    print(f"  - Usuarios a FREE: {cursor.rowcount}")
    
    # 2. Actualizar tabla plans
    print("\nActualizando planes...")
    cursor.execute("DELETE FROM plans WHERE name IN ('AdminG_Basic', 'AdminG_Plus', 'AdminPro_Start', 'AdminPro_Max')")
    print(f"  - Planes antiguos eliminados: {cursor.rowcount}")
    
    cursor.execute("""
        INSERT OR REPLACE INTO plans (name, display_name, price, description, is_active, created_at, updated_at) 
        VALUES 
        ('free', 'Plan Gratuito', 0, 'Plan gratuito basico', 1, datetime('now'), datetime('now')),
        ('starter', 'Plan Starter', 39900, 'Plan inicial PyMEs', 1, datetime('now'), datetime('now')),
        ('pro', 'Plan Pro', 99900, 'Plan profesional', 1, datetime('now'), datetime('now')),
        ('max', 'Plan Max', 249900, 'Plan completo', 1, datetime('now'), datetime('now'))
    """)
    print(f"  - Planes nuevos insertados: 4")
    
    conn.commit()
    
    # 3. Verificar
    print("\n" + "="*60)
    print("  RESULTADO")
    print("="*60)
    
    cursor.execute("SELECT plan, COUNT(*) FROM users GROUP BY plan")
    print("\nUsuarios por plan:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]} usuarios")
    
    cursor.execute("SELECT name, price FROM plans ORDER BY price")
    print("\nPlanes disponibles:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: ${row[1]:,.0f} COP")
    
    conn.close()
    print("\n" + "="*60)
    print("  COMPLETADO")
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\nERROR: {e}")
