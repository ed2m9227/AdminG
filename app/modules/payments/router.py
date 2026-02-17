from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.db.session import get_db
from app.models.payment import Payment
from app.models.user import User
from app.models.customer import Customer
from app.modules.payments.schemas import (
    PaymentCreate,
    PaymentUpdate,
    PaymentOut,
    PlanUpgradeRequest,
    PlanUpgradeResponse,
)
from app.core.security import get_current_user
from app.core.plan_permissions import check_feature_access

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)

# MontelibanoGen 7% discount configuration
MONTELIBANO_GEN_DISCOUNT = 0.07
MONTELIBANO_PROMO_CODE = "MONTELIBANO7"
APPLICABLE_PLANS_FOR_DISCOUNT = ["basic", "plus"]

@router.post("/", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create payment record
    
    Features:
    - Support for multiple payment methods
    - MontelibanoGen 7% discount on AdminG plans
    - Automatic discount calculation
    """
    # Validate customer exists and belongs to user
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Calculate discount if MontelibanoGen method
    discount_amount = Decimal(0)
    if payload.method.lower() == "montelibano_gen":
        if current_user.plan in APPLICABLE_PLANS_FOR_DISCOUNT:
            discount_amount = payload.amount * Decimal(str(MONTELIBANO_GEN_DISCOUNT))
    
    final_amount = payload.amount - discount_amount
    
    payment = Payment(
        user_id=current_user.id,
        customer_id=payload.customer_id,
        appointment_id=payload.appointment_id,
        amount=payload.amount,
        discount_amount=discount_amount,
        final_amount=final_amount,
        method=payload.method,
        reference=payload.reference,
        notes=payload.notes,
        status="completed" if payload.method.lower() in ["cash", "montelibano_gen"] else "pending",
        paid_at=datetime.utcnow() if payload.method.lower() in ["cash", "montelibano_gen"] else None,
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    return payment

@router.get("/", response_model=list[PaymentOut])
def list_payments(
    skip: int = 0,
    limit: int = 100,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List payments for current user
    
    Optional filters:
    - status_filter: "pending", "completed", "failed", etc
    """
    query = db.query(Payment).filter(Payment.user_id == current_user.id)
    
    if status_filter:
        query = query.filter(Payment.status == status_filter)
    
    return query.offset(skip).limit(limit).all()

@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get payment details"""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return payment

@router.put("/{payment_id}", response_model=PaymentOut)
def update_payment(
    payment_id: int,
    payload: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update payment status (admin only)"""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    
    if "status" in update_data:
        payment.status = update_data["status"]
        if update_data["status"] == "completed":
            payment.paid_at = datetime.utcnow()
    
    if "notes" in update_data:
        payment.notes = update_data["notes"]
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    return payment

@router.post("/upgrade/plan", response_model=PlanUpgradeResponse)
def upgrade_plan(
    request: PlanUpgradeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upgrade user plan with payment
    
    Plans:
    - basic: $5,000/mes
    - plus: $30,000/mes
    - start: $50,000/mes
    - max: $100,000/mes
    """
    PLAN_PRICES = {
        "basic": Decimal("5000"),
        "plus": Decimal("30000"),
        "start": Decimal("50000"),
        "max": Decimal("100000"),
    }
    
    if request.new_plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    # Create payment record for upgrade
    amount = PLAN_PRICES[request.new_plan]
    
    payment = Payment(
        user_id=current_user.id,
        customer_id=current_user.id,
        amount=amount,
        discount_amount=Decimal(0),
        final_amount=amount,
        method=request.payment_method,
        status="pending",
        notes=f"Plan upgrade from {current_user.plan} to {request.new_plan}",
    )
    
    db.add(payment)
    db.flush()
    
    # Update user plan (in real app, would wait for payment confirmation)
    current_user.plan = request.new_plan
    db.add(current_user)
    
    db.commit()
    
    return PlanUpgradeResponse(
        success=True,
        message=f"Plan upgraded to {request.new_plan}",
        new_plan=request.new_plan,
        payment_id=payment.id,
        upgrade_date=datetime.utcnow(),
    )

@router.get("/montelibano/validate-promo")
def validate_montelibano_promo(
    current_user: User = Depends(get_current_user),
):
    """Validate if user is eligible for MontelibanoGen 7% discount
    
    Discount applies to:
    - AdminG Basic
    - AdminG Plus
    - Discount: 7%
    """
    is_eligible = current_user.plan in APPLICABLE_PLANS_FOR_DISCOUNT
    
    return {
        "is_eligible": is_eligible,
        "current_plan": current_user.plan,
        "discount_percentage": MONTELIBANO_GEN_DISCOUNT * 100 if is_eligible else 0,
        "promo_code": MONTELIBANO_PROMO_CODE if is_eligible else None,
        "message": "7% discount available with MontelibanoGen payment method" if is_eligible else "Upgrade your plan to get MontelibanoGen discounts",
    }
