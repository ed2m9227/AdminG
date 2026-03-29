from app.db.session import SessionLocal
from app.models.payment import Payment
from sqlalchemy import func

db = SessionLocal()

# Get all payments
payments = db.query(Payment).all()
print(f'\n=== Total payments: {len(payments)} ===\n')

for p in payments:
    print(f'ID: {p.id} | Amount: {p.amount} | Final: {p.final_amount} | Status: "{p.status}" | Customer: {p.customer_id} | Created: {p.created_at}')

# Group by status
print('\n=== Payments by status ===')
status_counts = db.query(Payment.status, func.count(Payment.id)).group_by(Payment.status).all()
for status, count in status_counts:
    print(f'Status "{status}": {count} payments')

# Total revenue by status
print('\n=== Revenue by status ===')
revenue_by_status = db.query(Payment.status, func.sum(Payment.final_amount)).group_by(Payment.status).all()
for status, total in revenue_by_status:
    print(f'Status "{status}": ${total or 0}')

db.close()
