from pydantic import BaseModel
from datetime import datetime

class DashboardMetrics(BaseModel):
    total_customers: int
    total_appointments_month: int
    total_appointments_today: int
    total_transactions_month: int
    total_revenue_month: float
    average_ticket: float
    pending_payments: float
    top_services: list[dict]
    busiest_days: list[dict]

class ReportRequest(BaseModel):
    start_date: datetime
    end_date: datetime
    report_type: str  # "revenue", "customers", "appointments", "inventory"

class RevenueReport(BaseModel):
    total_revenue: float
    total_expenses: float
    cash_expenses: float = 0
    operational_expenses: float = 0
    incident_costs: float = 0
    payroll_expenses: float = 0
    net_profit: float
    balance: float
    paid_amount: float
    pending_amount: float
    by_payment_method: dict
    by_period: list[dict]

class CustomerReport(BaseModel):
    total_customers: int
    new_customers: int
    returning_customers: int
    retention_rate: float
    customer_lifetime_value: dict

class AppointmentReport(BaseModel):
    total_appointments: int
    completed_appointments: int
    cancelled_appointments: int
    no_show_rate: float
    average_duration: float
    busiest_hours: list[dict]

class InventoryReport(BaseModel):
    total_items: int
    low_stock_items: int
    total_value: float
    movement_history: list[dict]
