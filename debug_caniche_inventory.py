from app.db.session import SessionLocal
from app.models.user import User
from app.models.inventory import InventoryItem

db = SessionLocal()

# Buscar caniche1
caniche = db.query(User).filter(User.email == 'caniche1@example.com').first()
if not caniche:
    print("❌ Usuario caniche1 no encontrado")
else:
    print("\n✅ Usuario encontrado:")
    print(f"  ID: {caniche.id}")
    print(f"  Email: {caniche.email}")
    print(f"  Role: {caniche.role}")
    print(f"  Parent User ID: {caniche.parent_user_id}")
    
    # Obtener inventory items que la API retornaría para caniche
    print("\n📋 Items que caniche debería ver:")
    
    # Simulando la lógica backend
    user_ids = [caniche.id, caniche.parent_user_id] if caniche.parent_user_id else [caniche.id]
    print(f"   User IDs a filtrar: {user_ids}")
    
    items = db.query(InventoryItem).filter(
        InventoryItem.user_id.in_(user_ids)
    ).all()
    
    print(f"\n   Total items encontrados: {len(items)}")
    for item in items:
        owner = db.query(User).filter(User.id == item.user_id).first()
        print(f"   - {item.name} (SKU: {item.sku}) → Propiedad de: {owner.email if owner else 'desconocido'}")
    
    # También mostrar todos los items del admin para comparar
    admin = db.query(User).filter(User.email == 'admin@adminsystems.com').first()
    if admin:
        print("\n📋 Items del admin@adminsystems.com (para referencia):")
        admin_items = db.query(InventoryItem).filter(InventoryItem.user_id == admin.id).all()
        print(f"   Total items: {len(admin_items)}")
        for item in admin_items:
            print(f"   - {item.name} (SKU: {item.sku})")

db.close()
