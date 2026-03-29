from app.db.session import SessionLocal
from app.models.payment import Payment
from app.models.customer import Customer
from app.models.appointment import Appointment
from datetime import datetime
from decimal import Decimal

db = SessionLocal()

# Simulate the query from /reports/dashboard
now = datetime.utcnow()
month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

print(f'Current time (UTC): {now}')
print(f'Month start: {month_start}')
print()

# Assuming user_id = 1 (fabian@admin.com)
user_id = 1

# Total customers
total_customers = db.query(Customer).filter(Customer.user_id == user_id).count()
print(f'Total customers: {total_customers}')

# Appointments this month
appointments_month = db.query(Appointment).filter(
    Appointment.user_id == user_id,
    Appointment.appointment_date >= month_start
).count()
print(f'Appointments this month: {appointments_month}')

# Revenue this month (completed payments)
revenue_query = db.query(Payment).filter(
    Payment.user_id == user_id,
    Payment.created_at >= month_start,
    Payment.status == "completed"
)

completed_payments = revenue_query.all()
print(f'\nCompleted payments this month: {len(completed_payments)}')
for p in completed_payments:
    print(f'  ID {p.id}: ${p.final_amount} - Created: {p.created_at}')

total_revenue = sum(p.final_amount for p in completed_payments) or Decimal(0)
print(f'\nTotal revenue this month: ${total_revenue}')

# Pending payments (all, not filtered by month)
pending_query = db.query(Payment).filter(
    Payment.user_id == user_id,
    Payment.status == "pending"
)
pending_payments = pending_query.all()
pending_amount = sum(p.final_amount for p in pending_payments) or Decimal(0)
print(f'Pending payments (total): ${pending_amount}')

# Average ticket
completed_count = len(completed_payments)
average_ticket = float(total_revenue / completed_count) if completed_count > 0 else 0
print(f'Average ticket: ${average_ticket:.2f}')

print('\n=== Result ===')
print(f'{{"total_customers": {total_customers}, "total_appointments_month": {appointments_month}, "total_revenue_month": {float(total_revenue)}, "average_ticket": {average_ticket:.2f}, "pending_payments": {float(pending_amount)}}}')

db.close()
