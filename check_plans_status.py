"""
Verificar estado de planes en la base de datos
"""
import sqlite3

def check_plans():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    print("=" * 60)
    print("  VERIFICACIÓN DE ESTADO DE PLANES")
    print("=" * 60)
    
    # Verificar usuarios y sus planes
    print("\n📊 Usuarios por plan:")
    cursor.execute("SELECT plan, COUNT(*) as count FROM users GROUP BY plan")
    results = cursor.fetchall()
    
    if results:
        for row in results:
            print(f"  - {row[0]}: {row[1]} usuarios")
    else:
        print("  ℹ️  No hay usuarios en la base de datos")
    
    # Verificar tabla plans
    print("\n📋 Planes disponibles:")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='plans'")
    if cursor.fetchone():
        cursor.execute("SELECT name, display_name, price FROM plans")
        plans = cursor.fetchall()
        if plans:
            for plan in plans:
                print(f"  - {plan[0]}: {plan[1]} (${plan[2]:,.0f} COP)")
        else:
            print("  ℹ️  Tabla 'plans' existe pero está vacía")
    else:
        print("  ℹ️  Tabla 'plans' no existe")
    
    # Verificar todos los códigos de plan usados
    print("\n🔍 Todos los códigos de plan en uso:")
    cursor.execute("SELECT DISTINCT plan FROM users WHERE plan IS NOT NULL AND plan != ''")
    plans_in_use = cursor.fetchall()
    for plan in plans_in_use:
        print(f"  - {plan[0]}")
    
    conn.close()
    print("\n" + "=" * 60)

if __name__ == "__main__":
    try:
        check_plans()
    except Exception as e:
        print(f"❌ Error: {e}")
