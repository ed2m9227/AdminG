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
from app.models.authorization import Authorization
from sqlalchemy import or_
from app.modules.payments.schemas import (
    PaymentCreate,
    PaymentUpdate,
    PaymentOut,
    PlanUpgradeRequest,
    PlanUpgradeResponse,
)
from app.core.security import get_current_user
from app.core.features import Feature, has_feature

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)

# MontelibanoGen 7% discount configuration
MONTELIBANO_GEN_DISCOUNT = 0.07
MONTELIBANO_PROMO_CODE = "MONTELIBANO7"
APPLICABLE_PLANS_FOR_DISCOUNT = ["basic", "plus"]
WALK_IN_CUSTOMER_NAME = "Cliente Mostrador"

def get_user_ids_for_data_sharing(user_id: int, db: Session):
    """Retorna list de user_ids a incluir en queries (para compartir datos padre-hijo)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return [user_id]
    if user and user.parent_user_id:
        # Sub-usuario: incluir padre, propio y hermanos
        sibling_ids = [uid for (uid,) in db.query(User.id).filter(User.parent_user_id == user.parent_user_id).all()]
        return list(dict.fromkeys([user.parent_user_id, user.id, *sibling_ids]))
    else:
        # Usuario padre/admin: incluir datos propios y de sub-usuarios
        child_ids = [uid for (uid,) in db.query(User.id).filter(User.parent_user_id == user.id).all()]
        return [user.id, *child_ids]


def resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def require_payment_feature(user: User, feature: Feature):
    if has_feature(user.plan, feature, user.role, is_parent_account=not bool(user.parent_user_id)):
        return True
    raise HTTPException(status_code=403, detail="Feature not available in your plan")


def require_payment_manage_access(user: User):
    """Only parent/admin accounts can edit or delete payments."""
    if user.parent_user_id:
        raise HTTPException(status_code=403, detail="Solo el usuario padre puede editar o eliminar pagos")
    return True


def get_or_create_walk_in_customer(user: User, db: Session) -> Customer:
    """Get or create a shared walk-in customer. Always owned by the parent account."""
    # Always anchor to the parent so the whole family group shares one record
    owner_id = user.parent_user_id if user.parent_user_id else user.id
    customer = db.query(Customer).filter(
        Customer.user_id == owner_id,
        Customer.full_name == WALK_IN_CUSTOMER_NAME,
    ).first()

    if customer:
        return customer

    customer = Customer(
        user_id=owner_id,
        full_name=WALK_IN_CUSTOMER_NAME,
        notes="Creado automáticamente para ventas retail sin cliente.",
    )
    db.add(customer)
    db.flush()
    return customer

@router.post("/", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Create payment record with optional items breakdown
    
    Features:
    - Support for multiple payment methods
    - MontelibanoGen 7% discount on AdminG plans
    - Automatic discount calculation
    - Support for payment items (service, product, custom)
    - Automatic calculation of subtotal from items if provided
    """
    # Resolve customer: allow retail sales without explicit customer
    require_payment_feature(current_user, Feature.CREATE_PAYMENTS)
    user_ids = get_user_ids_for_data_sharing(current_user.id, db)
    if payload.customer_id is None:
        customer = get_or_create_walk_in_customer(current_user, db)
    else:
        customer = db.query(Customer).filter(
            Customer.id == payload.customer_id,
            Customer.user_id.in_(user_ids),
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

    owner_id = current_user.parent_user_id if current_user.parent_user_id else current_user.id
    authorization = None
    if payload.authorization_id:
        authorization = db.query(Authorization).filter(
            Authorization.id == payload.authorization_id,
            Authorization.user_id == owner_id,
        ).first()
        if not authorization:
            raise HTTPException(status_code=404, detail="Authorization not found")
        if authorization.status != "approved":
            raise HTTPException(status_code=400, detail="Solo se puede registrar pago sobre una autorización aprobada")
        if authorization.customer_id != customer.id:
            raise HTTPException(status_code=400, detail="La autorización no corresponde al cliente del pago")
        if authorization.linked_payment:
            raise HTTPException(status_code=400, detail="La autorización ya está vinculada a un pago")
    
    # Safely convert amount to Decimal
    amount_value = Decimal(str(payload.amount)) if payload.amount else Decimal('0')
    
    # If payment_items provided, calculate amount from items
    calculated_amount = Decimal(0)
    if payload.payment_items:
        for item in payload.payment_items:
            # Safely convert to Decimal
            qty = Decimal(str(item.quantity)) if item.quantity else Decimal('0')
            price = Decimal(str(item.unit_price)) if item.unit_price else Decimal('0')
            subtotal = qty * price
            calculated_amount += subtotal
    
    # Use provided amount or calculated
    final_amount_before_discount = amount_value if amount_value > 0 else calculated_amount
    
    # Calculate discount if MontelibanoGen method
    discount_amount = Decimal(0)
    if payload.method.lower() == "montelibano_gen":
        if current_user.plan in APPLICABLE_PLANS_FOR_DISCOUNT:
            discount_amount = final_amount_before_discount * Decimal(str(MONTELIBANO_GEN_DISCOUNT))
    
    final_amount = final_amount_before_discount - discount_amount
    
    # Use provided status or determine by method
    payment_status = payload.status if payload.status else (
        "completed" if payload.method.lower() in ["cash", "montelibano_gen"] else "pending"
    )
    
    payment = Payment(
        user_id=current_user.id,
        customer_id=customer.id,
        invoice_id=payload.invoice_id,  # NUEVO
        authorization_id=payload.authorization_id,
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
            # Safely convert all types
            qty = Decimal(str(item.quantity)) if item.quantity else Decimal('1')
            price = Decimal(str(item.unit_price)) if item.unit_price else Decimal('0')
            subtotal = qty * price
            
            # Safely convert IDs
            service_id_int = None
            if item.service_id:
                try:
                    service_id_int = int(item.service_id) if isinstance(item.service_id, str) else item.service_id
                except (ValueError, TypeError):
                    service_id_int = None
            
            inventory_id_int = None
            if item.inventory_item_id:
                try:
                    inventory_id_int = int(item.inventory_item_id) if isinstance(item.inventory_item_id, str) else item.inventory_item_id
                except (ValueError, TypeError):
                    inventory_id_int = None
            
            payment_item = PaymentItem(
                payment_id=payment.id,
                source_type=item.source_type,
                service_id=service_id_int,
                inventory_item_id=inventory_id_int,
                description=item.description,
                quantity=qty,
                unit_price=price,
                subtotal=subtotal,
            )
            db.add(payment_item)

            # Descontar stock para items de inventario (productos)
            if inventory_id_int:
                inv_item = db.query(InventoryItem).filter(
                    InventoryItem.id == inventory_id_int,
                    InventoryItem.user_id.in_(user_ids)
                ).first()
                if inv_item and inv_item.item_type == 'product':
                    qty_int = int(qty)
                    if inv_item.quantity < qty_int:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Stock insuficiente de {inv_item.name}. Disponible: {inv_item.quantity}, Solicitado: {qty_int}"
                        )
                    inv_item.quantity -= qty_int
                    db.add(inv_item)

    db.commit()
    db.refresh(payment)
    
    return payment

@router.get("/", response_model=list[PaymentOut])
def list_payments(
    skip: int = 0,
    limit: int = 100,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """List payments for current user
    
    Optional filters:
    - status_filter: "pending", "completed", "failed", etc
    """
    require_payment_feature(current_user, Feature.VIEW_PAYMENTS)
    user_ids = get_user_ids_for_data_sharing(current_user.id, db)
    query = db.query(Payment).options(joinedload(Payment.customer)).filter(Payment.user_id.in_(user_ids))
    
    if status_filter:
        query = query.filter(Payment.status == status_filter)
    
    return query.offset(skip).limit(limit).all()

@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Get payment details"""
    require_payment_feature(current_user, Feature.VIEW_PAYMENTS)
    user_ids = get_user_ids_for_data_sharing(current_user.id, db)
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
    current_user: User = Depends(resolve_user),
):
    """Update payment status, concept, or service"""
    require_payment_manage_access(current_user)
    user_ids = get_user_ids_for_data_sharing(current_user.id, db)
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
    """Upgrade user plan with payment (aligned with onboarding plans)."""
    PLAN_PRICES = {
        "starter": Decimal("39900"),
        "pro": Decimal("99900"),
        "max": Decimal("249900"),
    }
    PLAN_ALIASES = {
        "basic": "starter",
        "AdminG_Basic": "starter",
        "plus": "pro",
        "start": "pro",
        "AdminG_Plus": "pro",
        "AdminPro_Start": "pro",
        "AdminPro_Max": "max",
    }

    normalized_plan = PLAN_ALIASES.get(request.new_plan, request.new_plan)

    if normalized_plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    # Create payment record for upgrade
    amount = PLAN_PRICES[normalized_plan]
    
    upgrade_payment = Payment(
        user_id=current_user["id"],
        customer_id=current_user["id"],
        amount=amount,
        discount_amount=Decimal(0),
        final_amount=amount,
        method=request.payment_method,
        status="pending",
        notes=f"Plan upgrade from {current_user['plan']} to {normalized_plan}",
    )
    
    db.add(upgrade_payment)
    db.flush()
    
    # Update user plan (get User object from DB)
    user = db.query(User).filter(User.id == current_user["id"]).first()
    if user:
        user.plan = normalized_plan
        user.plan_start_date = datetime.utcnow()
        db.add(user)
    else:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.commit()
    
    return PlanUpgradeResponse(
        success=True,
        message=f"Plan upgraded to {normalized_plan}",
        new_plan=normalized_plan,
        payment_id=upgrade_payment.id,
        upgrade_date=datetime.utcnow(),
    )

@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Delete payment (admin only)"""
    require_payment_manage_access(current_user)
    user_ids = get_user_ids_for_data_sharing(current_user.id, db)
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id.in_(user_ids)
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
