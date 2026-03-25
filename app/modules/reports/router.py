from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal
from app.db.session import get_db
from app.models.user import User
from app.models.customer import Customer
from app.models.appointment import Appointment
from app.models.payment import Payment
from app.models.cash_transaction import CashTransaction
from app.models.inventory import InventoryItem, InventoryMovement
from app.modules.reports.schemas import (
    DashboardMetrics,
    RevenueReport,
    CustomerReport,
    AppointmentReport,
    InventoryReport,
    ReportRequest,
)
from app.core.security import get_current_user

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)


def resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

LEGACY_PLAN_MAP = {
    "basic": "starter",
    "AdminG_Basic": "starter",
    "plus": "pro",
    "AdminG_Plus": "pro",
    "start": "pro",
    "AdminPro_Start": "pro",
    "AdminPro_Max": "max",
}


def check_reports_access(user: User, required_plans: list[str] = ["starter", "pro", "max"]):
    """Check if user has access to reports features"""
    if user.role == "admin" or user.plan == "admin":
        return True

    normalized_plan = LEGACY_PLAN_MAP.get(user.plan, user.plan)
    if normalized_plan in required_plans:
        return True

    raise HTTPException(status_code=403, detail="Feature not available in your plan")

@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Get dashboard metrics for current user
    
    Available for:
    - AdminG Plus+ (with metrics)
    - AdminPro Start+ (with advanced metrics)
    """
    # Check plan permissions
    check_reports_access(current_user)
    
    # Metrics for current month
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    
    user_id = current_user.id
    
    # Total customers
    total_customers = db.query(Customer).filter(
        Customer.user_id == user_id
    ).count()
    
    # Appointments this month (need to join with Customer to filter by user)
    appointments_month = db.query(Appointment).join(
        Customer, Appointment.customer_id == Customer.id
    ).filter(
        Customer.user_id == user_id,
        Appointment.scheduled_at >= month_start
    ).count()

    appointments_today = db.query(Appointment).join(
        Customer, Appointment.customer_id == Customer.id
    ).filter(
        Customer.user_id == user_id,
        Appointment.scheduled_at >= today_start,
        Appointment.scheduled_at < tomorrow_start,
        Appointment.status.in_(["scheduled", "confirmed"]),
    ).count()
    
    # Revenue this month (Payments + Cash Sales)
    revenue_query = db.query(Payment).filter(
        Payment.user_id == user_id,
        Payment.status == "completed",
        or_(
            Payment.paid_at >= month_start,
            and_(Payment.paid_at.is_(None), Payment.created_at >= month_start),
        ),
    )
    
    payment_revenue = sum(p.final_amount for p in revenue_query.all()) or Decimal(0)
    
    # Cash register transactions this month
    cash_sales = db.query(CashTransaction).filter(
        CashTransaction.user_id == user_id,
        CashTransaction.transaction_type == "sale",
        CashTransaction.created_at >= month_start
    ).all()
    standalone_cash_sales = [t for t in cash_sales if not t.payment_id]
    cash_sales_total = sum(t.amount for t in standalone_cash_sales) or Decimal(0)
    
    # Cash register expenses this month
    cash_expenses = db.query(CashTransaction).filter(
        CashTransaction.user_id == user_id,
        CashTransaction.transaction_type == "expense",
        CashTransaction.created_at >= month_start
    ).all()
    cash_expenses_total = sum(t.amount for t in cash_expenses) or Decimal(0)
    
    # Total revenue = completed payments + standalone cash sales - cash expenses
    total_revenue = payment_revenue + cash_sales_total - cash_expenses_total
    
    # Average ticket based on unique sale transactions only.
    completed_payments = revenue_query.count()
    total_transactions = completed_payments + len(standalone_cash_sales)
    average_ticket = float((payment_revenue + cash_sales_total) / total_transactions) if total_transactions > 0 else 0
    
    # Pending payments
    pending = db.query(Payment).filter(
        Payment.user_id == user_id,
        Payment.status == "pending"
    )
    pending_amount = sum(p.final_amount for p in pending.all()) or Decimal(0)
    
    # Top services (placeholder - needs Service model)
    top_services = []
    
    # Busiest days
    busiest_days = []
    
    return DashboardMetrics(
        total_customers=total_customers,
        total_appointments_month=appointments_month,
        total_appointments_today=appointments_today,
        total_transactions_month=total_transactions,
        total_revenue_month=float(total_revenue),
        average_ticket=average_ticket,
        pending_payments=float(pending_amount),
        top_services=top_services,
        busiest_days=busiest_days,
    )

@router.post("/revenue", response_model=RevenueReport)
def get_revenue_report(
    request: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Generate revenue report for date range
    
    Available for:
    - AdminG Plus+ 
    - AdminPro Start+
    """
    user_id = current_user.id
    check_reports_access(current_user, ["starter", "pro", "max"])
    
    print(f"📊 Revenue Report - User: {user_id}, Period: {request.start_date} to {request.end_date}")
    
    payments = db.query(Payment).filter(
        Payment.user_id == user_id,
        Payment.created_at >= request.start_date,
        Payment.created_at <= request.end_date,
    ).all()
    
    payment_revenue = sum(p.final_amount for p in payments if p.status == "completed") or Decimal(0)
    print(f"  💳 Payments: {len(payments)}, Revenue: {payment_revenue}")
    
    # Cash register transactions in period
    cash_sales = db.query(CashTransaction).filter(
        CashTransaction.user_id == user_id,
        CashTransaction.transaction_type == "sale",
        CashTransaction.created_at >= request.start_date,
        CashTransaction.created_at <= request.end_date,
    
    ).all()
    cash_sales_total = sum(t.amount for t in cash_sales) or Decimal(0)
    print(f"  🤑 Cash Sales: {len(cash_sales)}, Total: {cash_sales_total}")
    
    cash_expenses = db.query(CashTransaction).filter(
        CashTransaction.user_id == user_id,
        CashTransaction.transaction_type == "expense",
        CashTransaction.created_at >= request.start_date,
        CashTransaction.created_at <= request.end_date
    ).all()
    cash_expenses_total = sum(t.amount for t in cash_expenses) or Decimal(0)
    print(f"  💸 Cash Expenses: {len(cash_expenses)}, Total: {cash_expenses_total}")
    
    # Debug: Check all cash transactions for user
    all_cash = db.query(CashTransaction).filter(CashTransaction.user_id == user_id).all()
    print(f"  📋 Total Cash Transactions (all dates): {len(all_cash)}")
    for t in all_cash[-5:]:  # Show last 5
        print(f"     - {t.transaction_type}: ${t.amount} on {t.created_at}")
    
    pending = sum(p.final_amount for p in payments if p.status == "pending") or Decimal(0)
    
    # Group by payment method
    by_method = {}
    for payment in payments:
        method = payment.method or "unknown"
        if method not in by_method:
            by_method[method] = 0
        by_method[method] += float(payment.final_amount)
    
    # Group by period (daily): ingresos, gastos, saldo
    by_period = []
    current_date = request.start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = request.end_date.replace(hour=23, minute=59, second=59, microsecond=999999)

    while current_date <= end_date:
        day_end = current_date + timedelta(days=1)

        day_payments = [p for p in payments if current_date <= p.created_at < day_end and p.status == "completed"]
        day_cash_sales = [t for t in cash_sales if current_date <= t.created_at < day_end]
        day_cash_expenses = [t for t in cash_expenses if current_date <= t.created_at < day_end]

        day_income = (sum(p.final_amount for p in day_payments) or Decimal(0)) + (sum(t.amount for t in day_cash_sales) or Decimal(0))
        day_expenses = sum(t.amount for t in day_cash_expenses) or Decimal(0)
        day_balance = day_income - day_expenses

        if day_payments or day_cash_sales or day_cash_expenses:
            by_period.append({
                "date": current_date.date().isoformat(),
                "income": float(day_income),
                "expenses": float(day_expenses),
                "balance": float(day_balance),
                "transactions": len(day_payments) + len(day_cash_sales) + len(day_cash_expenses),
            })

        current_date = day_end

    total_income = payment_revenue + cash_sales_total
    balance = total_income - cash_expenses_total

    return RevenueReport(
        total_revenue=float(total_income),
        total_expenses=float(cash_expenses_total),
        net_profit=float(balance),
        balance=float(balance),
        paid_amount=float(payment_revenue),
        pending_amount=float(pending),
        by_payment_method=by_method,
        by_period=by_period,
    )

@router.post("/customers", response_model=CustomerReport)
def get_customer_report(
    request: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Generate customer report for date range
    
    Available for:
    - AdminG Plus+
    - AdminPro Start+
    """
    user_id = current_user.id
    check_reports_access(current_user, ["starter", "pro", "max"])
    
    # Total customers
    total_customers = db.query(Customer).filter(
        Customer.user_id == user_id
    ).count()
    
    # New customers in period
    new_customers = db.query(Customer).filter(
        Customer.user_id == user_id,
        Customer.created_at >= request.start_date,
        Customer.created_at <= request.end_date,
    ).count()
    
    returning = total_customers - new_customers
    
    return CustomerReport(
        total_customers=total_customers,
        new_customers=new_customers,
        returning_customers=returning,
        retention_rate=float(returning / total_customers * 100) if total_customers > 0 else 0,
        customer_lifetime_value={},
    )

@router.post("/appointments", response_model=AppointmentReport)
def get_appointment_report(
    request: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Generate appointment report for date range
    
    Available for:
    - AdminG Plus+
    - AdminPro Start+
    """
    user_id = current_user.id
    check_reports_access(current_user, ["starter", "pro", "max"])
    
    appointments = db.query(Appointment).join(
        Customer, Appointment.customer_id == Customer.id
    ).filter(
        Customer.user_id == user_id,
        Appointment.scheduled_at >= request.start_date,
        Appointment.scheduled_at <= request.end_date,
    ).all()
    
    total = len(appointments)
    completed = len([a for a in appointments if a.status == "completed"])
    cancelled = len([a for a in appointments if a.status in ("cancelled", "canceled")])
    no_show = len([a for a in appointments if a.status == "no_show"])
    
    return AppointmentReport(
        total_appointments=total,
        completed_appointments=completed,
        cancelled_appointments=cancelled,
        no_show_rate=float(no_show / total * 100) if total > 0 else 0,
        average_duration=0.0,  # Placeholder
        busiest_hours=[],  # Placeholder
    )

@router.post("/inventory", response_model=InventoryReport)
def get_inventory_report(
    request: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Generate inventory report for date range
    
    Available for:
    - AdminPro Start+ (with inventory)
    """
    user_id = current_user.id
    check_reports_access(current_user, ["pro", "max"])
    
    items = db.query(InventoryItem).filter(
        InventoryItem.user_id == user_id
    ).all()
    
    low_stock = len([i for i in items if i.quantity <= i.min_quantity])
    total_value = sum(i.unit_price * i.quantity for i in items) or Decimal(0)
    
    movements = db.query(InventoryMovement).filter(
        InventoryMovement.created_at >= request.start_date,
        InventoryMovement.created_at <= request.end_date,
    ).all()

    movement_history = [
        {
            "item_id": m.item_id,
            "type": m.type,
            "quantity": float(m.quantity),
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in movements
    ]

    return InventoryReport(
        total_items=len(items),
        low_stock_items=low_stock,
        total_value=float(total_value),
        movement_history=movement_history,
    )

@router.get("/export/{report_type}")
def export_report(
    report_type: str,
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Export report as CSV
    
    Available for:
    - AdminPro Start+ (exports)
    """
    check_reports_access(current_user, ["pro", "max"])
    
    return {
        "message": "Export functionality coming soon",
        "report_type": report_type,
        "start_date": start_date,
        "end_date": end_date,
    }
