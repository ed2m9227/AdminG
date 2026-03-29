"""
Script para migrar planes antiguos a nuevos
Ejecutar con: python migrate_plans.py
"""
import sys
import os

# Añadir el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Configuración de la base de datos
DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def migrate_plans():
    """Migrar planes antiguos a nuevos"""
    db = SessionLocal()
    
    try:
        print("🔄 Iniciando migración de planes...")
        
        # 1. Actualizar planes en tabla users
        print("\n📝 Actualizando planes de usuarios...")
        
        # Mapeo: AdminG_Basic -> starter
        result = db.execute(text("""
            UPDATE users 
            SET plan = 'starter' 
            WHERE plan IN ('AdminG_Basic', 'basic')
        """))
        print(f"  - AdminG_Basic/basic -> starter: {result.rowcount} usuarios")
        
        # Mapeo: AdminG_Plus -> starter
        result = db.execute(text("""
            UPDATE users 
            SET plan = 'starter' 
            WHERE plan = 'AdminG_Plus'
        """))
        print(f"  - AdminG_Plus -> starter: {result.rowcount} usuarios")
        
        # Mapeo: AdminPro_Start -> pro
        result = db.execute(text("""
            UPDATE users 
            SET plan = 'pro' 
            WHERE plan IN ('AdminPro_Start', 'start')
        """))
        print(f"  - AdminPro_Start/start -> pro: {result.rowcount} usuarios")
        
        # Mapeo: AdminPro_Max -> max
        result = db.execute(text("""
            UPDATE users 
            SET plan = 'max' 
            WHERE plan IN ('AdminPro_Max', 'plus')
        """))
        print(f"  - AdminPro_Max/plus -> max: {result.rowcount} usuarios")
        
        # Mapeo: admin -> max (usuarios administrativos tienen plan máximo)
        result = db.execute(text("""
            UPDATE users 
            SET plan = 'max' 
            WHERE plan = 'admin'
        """))
        print(f"  - admin -> max: {result.rowcount} usuarios")
        
        # Usuarios sin plan válido -> free
        result = db.execute(text("""
            UPDATE users 
            SET plan = 'free' 
            WHERE plan IS NULL OR plan = '' OR plan NOT IN ('free', 'starter', 'pro', 'max')
        """))
        print(f"  - Sin plan/inválido -> free: {result.rowcount} usuarios")
        
        # 2. Verificar si tabla plans existe
        print("\n🗂️  Actualizando tabla de planes...")
        result = db.execute(text("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='plans'
        """))
        
        if result.fetchone():
            # Eliminar planes antiguos
            result = db.execute(text("""
                DELETE FROM plans 
                WHERE name IN ('AdminG_Basic', 'AdminG_Plus', 'AdminPro_Start', 'AdminPro_Max', 'basic', 'plus', 'start')
            """))
            print(f"  - Eliminados {result.rowcount} planes antiguos")
            
            # Insertar nuevos planes
            db.execute(text("""
                INSERT OR REPLACE INTO plans (name, display_name, price, description, is_active, created_at, updated_at)
                VALUES 
                    ('free', 'Plan Gratuito', 0.00, 'Plan gratuito con funcionalidades básicas', 1, datetime('now'), datetime('now')),
                    ('starter', 'Plan Starter', 39900.00, 'Plan inicial para pequeños negocios', 1, datetime('now'), datetime('now')),
                    ('pro', 'Plan Pro', 99900.00, 'Plan profesional con funcionalidades avanzadas', 1, datetime('now'), datetime('now')),
                    ('max', 'Plan Max', 249900.00, 'Plan máximo con todas las funcionalidades', 1, datetime('now'), datetime('now'))
            """))
            print("  ✅ Insertados 4 nuevos planes")
        else:
            print("  ℹ️  Tabla 'plans' no existe (se creará en seed)")
        
        # Commit de todos los cambios
        db.commit()
        
        print("\n✅ Migración completada exitosamente")
        
        # Mostrar resumen
        print("\n📊 Resumen de usuarios por plan:")
        result = db.execute(text("SELECT plan, COUNT(*) as count FROM users GROUP BY plan"))
        for row in result:
            print(f"  - {row[0]}: {row[1]} usuarios")
        
    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def reseed_plans():
    """Re-seed de planes usando el servicio"""
    print("\n🌱 Ejecutando re-seed de planes...")
    
    try:
        from app.modules.plans.service import seed_plans
        from app.db.session import get_db
        
        db = next(get_db())
        seed_plans(db)
        db.commit()
        print("✅ Re-seed completado")
        
    except Exception as e:
        print(f"❌ Error en re-seed: {e}")
        raise

if __name__ == "__main__":
    print("=" * 60)
    print("  MIGRACIÓN DE PLANES: Antiguo → Nuevo")
    print("=" * 60)
    print("\nPLANES ANTIGUOS → NUEVOS:")
    print("  AdminG_Basic    → starter  ($39,900 COP/mes)")
    print("  AdminG_Plus     → starter  ($39,900 COP/mes)")
    print("  AdminPro_Start  → pro      ($99,900 COP/mes)")
    print("  AdminPro_Max    → max      ($249,900 COP/mes)")
    print("  admin           → max      ($249,900 COP/mes)")
    print("  Sin plan        → free     ($0)")
    print("=" * 60)
    
    try:
        # Ejecutar migración
        migrate_plans()
        
        # Ejecutar re-seed
        reseed_plans()
        
        print("\n" + "=" * 60)
        print("  ✅ MIGRACIÓN COMPLETADA")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR CRÍTICO: {e}")
        sys.exit(1)
