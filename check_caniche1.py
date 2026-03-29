from app.db.session import SessionLocal
from app.models.user import User
from app.models.inventory import InventoryItem

db = SessionLocal()

# Buscar usuario caniche1
user = db.query(User).filter(User.email.like('%caniche1%')).first()

if user:
    print(f'\n=== Usuario caniche1 ===')
    print(f'ID: {user.id}')
    print(f'Email: {user.email}')
    print(f'Role: {user.role}')
    print(f'Plan: {user.plan}')
    print(f'parent_user_id: {user.parent_user_id}')
    print(f'onboarding_completed: {user.onboarding_completed}')
    print(f'created_at: {user.created_at}')
    
    # Ver items de inventario de caniche1
    items = db.query(InventoryItem).filter(InventoryItem.user_id == user.id).all()
    print(f'\n=== Items de inventario de caniche1 (user_id={user.id}) ===')
    print(f'Total: {len(items)}')
    for item in items:
        print(f'  - {item.name} (SKU: {item.sku})')
    
    # Ver items de admin
    admin = db.query(User).filter(User.email == 'admin@adminsystems.com').first()
    if admin:
        admin_items = db.query(InventoryItem).filter(InventoryItem.user_id == admin.id).all()
        print(f'\n=== Items de inventario de admin (user_id={admin.id}) ===')
        print(f'Total: {len(admin_items)}')
        for item in admin_items[:5]:
            print(f'  - {item.name} (SKU: {item.sku})')
else:
    print('Usuario caniche1 no encontrado')
    print('\nUsuarios disponibles:')
    users = db.query(User).all()
    for u in users:
        print(f'  - {u.email} (parent_user_id={u.parent_user_id})')

db.close()
