import sqlite3

for db in ['app.db', 'admingpyme.db', 'sql_app.db', 'test.db']:
    try:
        c = sqlite3.connect(db)
        tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        if 'services' in tables:
            rows = c.execute('SELECT id, user_id, name, is_active FROM services').fetchall()
            print(f'{db}: {len(rows)} services')
            for r in rows:
                print(f'  id={r[0]} user_id={r[1]} name={r[2]} is_active={r[3]}')
        else:
            print(f'{db}: no services table. Tables: {tables[:5]}')
        c.close()
    except Exception as e:
        print(f'{db}: error - {e}')

# Also check users and plans
print()
for db in ['app.db', 'admingpyme.db']:
    try:
        c = sqlite3.connect(db)
        rows = c.execute('SELECT id, email, parent_user_id, plan, role FROM users').fetchall()
        print(f'{db}: {len(rows)} users')
        for r in rows:
            print(f'  id={r[0]} email={r[1]} parent={r[2]} plan={r[3]} role={r[4]}')
        c.close()
    except Exception as e:
        print(f'{db} users: error - {e}')

# Check appointments
print()
try:
    c = sqlite3.connect('app.db')
    apts = c.execute('SELECT id, customer_id, service_id, status FROM appointments').fetchall()
    print(f'app.db: {len(apts)} appointments')
    for r in apts:
        print(f'  id={r[0]} customer_id={r[1]} service_id={r[2]} status={r[3]}')
    c.close()
except Exception as e:
    print(f'appointments error: {e}')
