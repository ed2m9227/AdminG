import sys
sys.path.insert(0, '.')

from app.db.session import SessionLocal
from app.models.user import User
from app.modules.customers.router import get_user_ids_for_data_sharing as customer_scope
from app.modules.services.router import get_user_ids_for_data_sharing as service_scope
from app.modules.payments.router import get_user_ids_for_data_sharing as payment_scope


def main():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "caniche2@empleado2.com").first()
        if not user:
            print("user not found")
            return

        print("user:", user.id, user.parent_user_id)
        print("customers:", customer_scope(user))
        print("services:", service_scope(user))
        print("payments:", payment_scope(user.id, db))
    finally:
        db.close()


if __name__ == "__main__":
    main()
