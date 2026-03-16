from app.db.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE inventory_items ADD COLUMN item_type TEXT DEFAULT "product" NOT NULL'))
        conn.commit()
        print('Column item_type added successfully')
    except Exception as e:
        print(f'Error: {e}')