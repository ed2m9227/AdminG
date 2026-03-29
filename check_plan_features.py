from app.db.session import SessionLocal
from app.models.user import User
from app.core.features import get_available_features, get_plan_limits

db = SessionLocal()

# Buscar usuarios caniche
users = db.query(User).filter(User.email.like('%caniche%')).all()

print('\n=== VALIDACIÓN DE FEATURES POR PLAN ===\n')

for user in users:
    features = get_available_features(user.plan, user.role)
    limits = get_plan_limits(user.plan)
    
    print(f'Usuario: {user.email}')
    print(f'  Plan: {user.plan.upper()}')
    print(f'  Role: {user.role}')
    print(f'  Features disponibles: {len(features)}')
    
    # Mostrar features principales
    main_features = {
        'view_customers': 'Ver Clientes',
        'create_customers': 'Crear Clientes',
        'edit_customers': 'Editar Clientes',
        'delete_customers': 'Eliminar Clientes',
        'view_appointments': 'Ver Citas',
        'create_appointments': 'Crear Citas',
        'view_inventory': 'Ver Inventario',
        'create_products': 'Crear Productos',
        'view_payments': 'Ver Pagos',
        'create_payments': 'Crear Pagos',
        'view_reports': 'Ver Reportes',
        'use_cashregister': 'Usar Caja',
        'view_team': 'Ver Equipo',
        'manage_team_users': 'Gestionar Equipo',
    }
    
    print('\n  Acceso a módulos:')
    for feature, label in main_features.items():
        has_access = feature in features
        icon = '✅' if has_access else '❌'
        print(f'    {icon} {label}')
    
    print(f'\n  Límites del plan:')
    print(f'    - Team members: {limits.get("team_members", 0)}')
    print(f'    - Customers: {limits.get("customers", 0)}')
    print(f'    - Appointments: {limits.get("appointments", 0)}')
    print('\n' + '='*50 + '\n')

db.close()
