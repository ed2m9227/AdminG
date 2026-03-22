import sys; sys.path.insert(0,'.')
from app.db.session import SessionLocal
from app.models.user import User
from app.models.customer import Customer

db = SessionLocal()
try:
    parent = db.query(User).filter(User.id==4).first()
    child_ids = [c.id for c in (parent.parent_user or [])]
    user_ids = [parent.id, *child_ids]
    print('Parent scope user_ids:', user_ids)
    custs = db.query(Customer).filter(Customer.user_id.in_(user_ids)).all()
    for c in custs:
        print(f'  Customer: {c.full_name} (user_id={c.user_id})')
finally:
    db.close()
