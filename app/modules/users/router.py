from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.modules.users.schemas import UserCreate, UserOut
from app.core.permissions import require_permission
from app.modules.auth.service import create_user as create_auth_user
from app.core.security import get_current_user
from app.models.user import User
from app.core.features import filter_for_business_type


router = APIRouter(prefix="/users", tags=["Users"])

PAID_PLAN_ALIASES = {
    "starter", "pro", "max",
    "basic", "plus", "start",
    "AdminG_Basic", "AdminG_Plus",
    "AdminPro_Start", "AdminPro_Max",
}
PLAN_DURATION_DAYS = 30


def enforce_plan_expiration(user: User, db: Session) -> tuple[bool, datetime | None]:
    """Downgrade expired paid plans to free and return expiration state."""
    if user.plan == "free" or user.plan == "admin":
        return False, None

    if user.plan not in PAID_PLAN_ALIASES:
        return False, None

    if not user.plan_start_date:
        return False, None

    expires_at = user.plan_start_date + timedelta(days=PLAN_DURATION_DAYS)
    if datetime.utcnow() <= expires_at:
        return False, expires_at

    user.plan = "free"
    user.plan_start_date = datetime.utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)
    return True, expires_at

@router.get("/me", response_model=UserOut)
def get_current_user_info(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current logged-in user information"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    plan_expired, plan_expires_at = enforce_plan_expiration(user, db)
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "plan": user.plan,
        "is_active": user.is_active,
        "business_type": user.business_type,
        "plan_start_date": user.plan_start_date,
        "plan_expires_at": plan_expires_at,
        "plan_expired": plan_expired,
        "onboarding_completed": user.onboarding_completed,
        "plan_paid": getattr(user, "plan_paid", True),
        "parent_user_id": user.parent_user_id,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }

@router.get("/")
def list_users(current_user=Depends(get_current_user)):
    return {"message": "Users module working", "user_id": current_user["id"]}

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    created = create_auth_user(user.email, user.password, user.role, user.plan, db)
    return {"email": created.email, "role": created.role}

@router.post("/")
def create_user_endpoint(
    user: UserCreate,
    current_user=Depends(require_permission("users.create")),
    db: Session = Depends(get_db)
):
    created = create_auth_user(user.email, user.password, user.role, user.plan, db)
    return {"message": "User created", "email": created.email}

@router.post("/me/complete-onboarding")
def complete_onboarding(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark onboarding as completed for current user"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.onboarding_completed = True
    db.commit()
    db.refresh(user)
    
    return {"success": True, "message": "Onboarding marked as completed"}


class PaymentReferencePayload(BaseModel):  # noqa: F811 – re-declared locally prevented
    reference: str
    plan: str


@router.post("/me/submit-payment-reference")
def submit_payment_reference(
    payload: PaymentReferencePayload,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Store Nequi/PSE payment reference for admin review."""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not payload.reference or len(payload.reference.strip()) < 4:
        raise HTTPException(status_code=400, detail="Referencia de pago inválida")

    setattr(user, "plan_payment_reference", payload.reference.strip())
    db.add(user)
    db.commit()
    return {
        "success": True,
        "message": "Referencia recibida. Un administrador activará tu cuenta pronto.",
        "reference": payload.reference.strip(),
    }


@router.patch("/admin/activate-plan/{user_id}")
def admin_activate_plan(
    user_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin-only: mark a user's plan as paid and activate dashboard access."""
    admin = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not admin or admin.role != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden activar planes")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    setattr(target, "plan_paid", True)
    target.plan_start_date = datetime.utcnow()
    db.add(target)
    db.commit()
    db.refresh(target)
    return {"success": True, "user_id": target.id, "plan": target.plan, "plan_paid": True}

@router.get("/me/features")
def get_user_features(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available features for current user based on plan and role"""
    from app.core.features import get_available_features, get_plan_limits
    
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    plan_expired, plan_expires_at = enforce_plan_expiration(user, db)

    features = get_available_features(
        user.plan,
        user.role,
        is_parent_account=not bool(user.parent_user_id),
    )
    features = filter_for_business_type(features, user.business_type)
    limits = get_plan_limits(user.plan)

    return {
        "plan": user.plan,
        "role": user.role,
        "business_type": user.business_type,
        "features": features,
        "limits": limits,
        "plan_expired": plan_expired,
        "plan_expires_at": plan_expires_at,
        "available_plans": ["free", "starter", "pro", "max"],
    }