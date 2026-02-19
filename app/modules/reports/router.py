from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal
from app.db.session import get_db
from app.models.user import User
from app.models.customer import Customer
from app.models.appointment import Appointment
from app.models.payment import Payment
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
from app.core.plan_permissions import check_feature_access

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
    if current_user.plan not in ["plus", "start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    # Metrics for current month
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Total customers
    total_customers = db.query(Customer).filter(
        Customer.user_id == current_user.id
    ).count()
    
    # Appointments this month
    appointments_month = db.query(Appointment).filter(
        Appointment.user_id == current_user.id,
        Appointment.appointment_date >= month_start
    ).count()
    
    # Revenue this month
    revenue_query = db.query(Payment).filter(
        Payment.user_id == current_user.id,
        Payment.created_at >= month_start,
        Payment.status == "completed"
    )
    
    total_revenue = sum(p.final_amount for p in revenue_query.all()) or Decimal(0)
    
    # Average ticket
    completed_payments = revenue_query.count()
    average_ticket = float(total_revenue / completed_payments) if completed_payments > 0 else 0
    
    # Pending payments
    pending = db.query(Payment).filter(
        Payment.user_id == current_user.id,
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
    if current_user.plan not in ["plus", "start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id,
        Payment.created_at >= request.start_date,
        Payment.created_at <= request.end_date,
    ).all()
    
    total_revenue = sum(p.final_amount for p in payments if p.status == "completed") or Decimal(0)
    pending = sum(p.final_amount for p in payments if p.status == "pending") or Decimal(0)
    
    # Group by payment method
    by_method = {}
    for payment in payments:
        method = payment.method or "unknown"
        if method not in by_method:
            by_method[method] = 0
        by_method[method] += float(payment.final_amount)
    
    # Group by period (daily)
    by_period = []
    current_date = request.start_date
    while current_date <= request.end_date:
        day_end = current_date + timedelta(days=1)
        day_payments = [p for p in payments if request.start_date <= p.created_at < day_end]
        day_total = sum(p.final_amount for p in day_payments if p.status == "completed") or Decimal(0)
        
        if day_payments:
            by_period.append({
                "date": current_date.date().isoformat(),
                "revenue": float(day_total),
                "transactions": len(day_payments),
            })
        
        current_date = day_end
    
    return RevenueReport(
        total_revenue=float(total_revenue),
        paid_amount=float(total_revenue),
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
    if current_user.plan not in ["plus", "start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    # Total customers
    total_customers = db.query(Customer).filter(
        Customer.user_id == current_user.id
    ).count()
    
    # New customers in period
    new_customers = db.query(Customer).filter(
        Customer.user_id == current_user.id,
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
    if current_user.plan not in ["plus", "start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    appointments = db.query(Appointment).filter(
        Appointment.user_id == current_user.id,
        Appointment.appointment_date >= request.start_date,
        Appointment.appointment_date <= request.end_date,
    ).all()
    
    total = len(appointments)
    completed = len([a for a in appointments if a.status == "completed"])
    cancelled = len([a for a in appointments if a.status == "cancelled"])
    
    return AppointmentReport(
        total_appointments=total,
        completed_appointments=completed,
        cancelled_appointments=cancelled,
        no_show_rate=float((total - completed) / total * 100) if total > 0 else 0,
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
    if current_user.plan not in ["start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    items = db.query(InventoryItem).filter(
        InventoryItem.user_id == current_user.id
    ).all()
    
    low_stock = len([i for i in items if i.quantity <= i.min_quantity])
    total_value = sum(i.unit_price * i.quantity for i in items) or Decimal(0)
    
    movements = db.query(InventoryMovement).filter(
        InventoryMovement.created_at >= request.start_date,
        InventoryMovement.created_at <= request.end_date,
    ).all()
    
    return InventoryReport(
        total_items=len(items),
        low_stock_items=low_stock,
        total_value=float(total_value),
        movement_history=[],
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
    if current_user.plan not in ["start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    return {
        "message": "Export functionality coming soon",
        "report_type": report_type,
        "start_date": start_date,
        "end_date": end_date,
    }
