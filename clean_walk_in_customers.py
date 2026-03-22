"""One-time cleanup: merge duplicate 'Cliente Mostrador' walk-in customer records.
Sub-user owned walk-ins are redundant now that parent handles the shared record."""
import sys
sys.path.insert(0, '.')
from app.db.session import SessionLocal
from app.models.customer import Customer
from app.models.user import User
from sqlalchemy import text

db = SessionLocal()

try:
    walk_ins = db.query(Customer).filter(Customer.full_name == 'Cliente Mostrador').all()
    print(f'Walk-in customers found: {len(walk_ins)}')
    for c in walk_ins:
        owner = db.query(User).filter(User.id == c.user_id).first()
        parent_id = owner.parent_user_id if owner else None
        print(f'  id={c.id}, user_id={c.user_id}, is_sub_user={parent_id is not None}')

    changes = 0
    for c in walk_ins:
        owner = db.query(User).filter(User.id == c.user_id).first()
        if owner and owner.parent_user_id:
            parent_walk_in = db.query(Customer).filter(
                Customer.full_name == 'Cliente Mostrador',
                Customer.user_id == owner.parent_user_id
            ).first()
            if parent_walk_in:
                db.execute(text(f'UPDATE payments SET customer_id={parent_walk_in.id} WHERE customer_id={c.id}'))
                db.delete(c)
                print(f'  -> Deleted sub-user walk-in id={c.id}, payments reassigned to parent walk-in id={parent_walk_in.id}')
            else:
                c.user_id = owner.parent_user_id
                print(f'  -> Moved walk-in id={c.id} ownership to parent id={owner.parent_user_id}')
            changes += 1

    db.commit()
    print(f'Done. {changes} duplicate(s) cleaned.')
finally:
    db.close()
