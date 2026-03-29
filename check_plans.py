from app.db.session import get_db
from app.models.user import User
from sqlalchemy import func

db = next(get_db())
plans = db.query(User.plan, func.count(User.id)).group_by(User.plan).all()
print('Planes en DB:')
for plan, count in plans:
    print(f'{plan}: {count}')

# Check for users with no plan
no_plan = db.query(func.count(User.id)).filter(User.plan.is_(None)).scalar()
print(f'Usuarios sin plan: {no_plan}')

# Check for empty string plan
empty_plan = db.query(func.count(User.id)).filter(User.plan == '').scalar()
print(f'Usuarios con plan vacío: {empty_plan}')

total_users = db.query(func.count(User.id)).scalar()
active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
print(f'Total users: {total_users}')
print(f'Active users: {active_users}')

# List all users with their plans
users = db.query(User.id, User.email, User.plan, User.is_active).all()
print('Usuarios:')
for u in users:
    print(f'ID:{u.id} Email:{u.email} Plan:{u.plan} Active:{u.is_active}')