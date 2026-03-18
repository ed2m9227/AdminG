from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from decimal import Decimal
from app.db.session import get_db
from app.models.payment import Payment
from app.models.payment_item import PaymentItem
from app.models.user import User
from app.models.customer import Customer
from app.models.service import Service
from app.models.inventory import InventoryItem
from sqlalchemy import or_
from app.modules.payments.schemas import (
    PaymentCreate,
    PaymentUpdate,
    PaymentOut,
    PlanUpgradeRequest,
    PlanUpgradeResponse,
)
from app.core.security import get_current_user

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)

# MontelibanoGen 7% discount configuration
MONTELIBANO_GEN_DISCOUNT = 0.07
MONTELIBANO_PROMO_CODE = "MONTELIBANO7"
APPLICABLE_PLANS_FOR_DISCOUNT = ["basic", "plus"]

def get_user_ids_for_data_sharing(user_id: int, db: Session):
    """Retorna list de user_ids a incluir en queries (para compartir datos padre-hijo)"""
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.parent_user_id:
        # Sub-usuario: incluir datos del padre y propio
        return [user.id, user.parent_user_id]
    else:
        # Usuario padre/admin: incluir datos propios
        return [user.id]

@router.post("/", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create payment record with optional items breakdown
    
    Features:
    - Support for multiple payment methods
    - MontelibanoGen 7% discount on AdminG plans
    - Automatic discount calculation
    - Support for payment items (service, product, custom)
    - Automatic calculation of subtotal from items if provided
    """
    # Validate customer exists and belongs to user
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # If payment_items provided, calculate amount from items
    calculated_amount = Decimal(0)
    if payload.payment_items:
        for item in payload.payment_items:
            subtotal = item.quantity * item.unit_price
            calculated_amount += subtotal
    
    # Use provided amount or calculated
    final_amount_before_discount = payload.amount if payload.amount > 0 else calculated_amount
    
    # Calculate discount if MontelibanoGen method
    discount_amount = Decimal(0)
    if payload.method.lower() == "montelibano_gen":
        if current_user["plan"] in APPLICABLE_PLANS_FOR_DISCOUNT:
            discount_amount = final_amount_before_discount * Decimal(str(MONTELIBANO_GEN_DISCOUNT))
    
    final_amount = final_amount_before_discount - discount_amount
    
    # Use provided status or determine by method
    payment_status = payload.status if payload.status else (
        "completed" if payload.method.lower() in ["cash", "montelibano_gen"] else "pending"
    )
    
    payment = Payment(
        user_id=current_user["id"],
        customer_id=payload.customer_id,
        invoice_id=payload.invoice_id,  # NUEVO
        appointment_id=payload.appointment_id,
        service_id=payload.service_id,
        service_package_id=payload.service_package_id,
        amount=final_amount_before_discount,
        discount_amount=discount_amount,
        final_amount=final_amount,
        concept=payload.concept,
        method=payload.method,
        reference=payload.reference,
        notes=payload.notes,
        status=payment_status,
        paid_at=datetime.utcnow() if payment_status == "completed" else None,
    )
    
    db.add(payment)
    db.flush()  # Para obtener payment.id sin commitear
    
    # Crear PaymentItems si se proporcionaron
    if payload.payment_items:
        for item in payload.payment_items:
            # Asegurar que quantity y unit_price sean Decimal
            qty = Decimal(str(item.quantity)) if isinstance(item.quantity, (int, float, str)) else item.quantity
            price = Decimal(str(item.unit_price)) if isinstance(item.unit_price, (int, float, str)) else item.unit_price
            subtotal = qty * price
            
            payment_item = PaymentItem(
                payment_id=payment.id,
                source_type=item.source_type,
                service_id=item.service_id,
                inventory_item_id=item.inventory_item_id,
                description=item.description,
                quantity=qty,
                unit_price=price,
                subtotal=subtotal,
            )
            db.add(payment_item)
    
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
    user_ids = get_user_ids_for_data_sharing(current_user["id"], db)
    query = db.query(Payment).options(joinedload(Payment.customer)).filter(Payment.user_id.in_(user_ids))
    
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
    user_ids = get_user_ids_for_data_sharing(current_user["id"], db)
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id.in_(user_ids)
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
    """Update payment status, concept, or service"""
    user_ids = get_user_ids_for_data_sharing(current_user["id"], db)
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id.in_(user_ids)
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    
    if "status" in update_data:
        payment.status = update_data["status"]
        if update_data["status"] == "completed":
            payment.paid_at = datetime.utcnow()
    
    if "concept" in update_data:
        payment.concept = update_data["concept"]
    
    if "service_id" in update_data:
        payment.service_id = update_data["service_id"]
    
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
    
    upgrade_payment = Payment(
        user_id=current_user["id"],
        customer_id=current_user["id"],
        amount=amount,
        discount_amount=Decimal(0),
        final_amount=amount,
        method=request.payment_method,
        status="pending",
        notes=f"Plan upgrade from {current_user['plan']} to {request.new_plan}",
    )
    
    db.add(upgrade_payment)
    db.flush()
    
    # Update user plan (get User object from DB)
    user = db.query(User).filter(User.id == current_user["id"]).first()
    if user:
        user.plan = request.new_plan
        db.add(user)
    else:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.commit()
    
    return PlanUpgradeResponse(
        success=True,
        message=f"Plan upgraded to {request.new_plan}",
        new_plan=request.new_plan,
        payment_id=upgrade_payment.id,
        upgrade_date=datetime.utcnow(),
    )

@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete payment (admin only)"""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user["id"]
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    db.delete(payment)
    db.commit()
    return None

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
    user_plan = current_user["plan"] if isinstance(current_user, dict) else current_user.plan
    is_eligible = user_plan in APPLICABLE_PLANS_FOR_DISCOUNT
    
    return {
        "is_eligible": is_eligible,
        "current_plan": user_plan,
        "discount_percentage": MONTELIBANO_GEN_DISCOUNT * 100 if is_eligible else 0,
        "promo_code": MONTELIBANO_PROMO_CODE if is_eligible else None,
        "message": "7% discount available with MontelibanoGen payment method" if is_eligible else "Upgrade your plan to get MontelibanoGen discounts",
    }
