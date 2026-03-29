from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.users.schemas import UserCreate, UserOut
from app.core.permissions import require_permission
from app.modules.auth.service import create_user as create_auth_user
from app.core.security import get_current_user
from app.models.user import User


router = APIRouter(prefix="/users", tags=["Users"])

PAID_PLAN_ALIASES = {
    "starter", "pro", "max",
    "basic", "plus", "start",
    "AdminG_Basic", "AdminG_Plus",
    "AdminPro_Start", "AdminPro_Max",
}
PLAN_DURATION_DAYS = 30

HEALTHCARE_BUSINESS_TYPES = {
    "veterinaria",
    "consultorio",
    "clinica",
    "dentista",
    "dental",
    "fisioterapia",
    "nutricion",
    "medicina_general",
}


def _filter_features_by_business_type(features: list[str], business_type: str | None) -> list[str]:
    """Apply business-type feature filtering on top of plan/role features."""
    normalized_type = (business_type or "").strip().lower()

    # Non-healthcare businesses do not need medical-document workflows.
    if normalized_type and normalized_type not in HEALTHCARE_BUSINESS_TYPES:
        blocked = {
            "view_documents",
            "create_documents",
            "edit_documents",
            "delete_documents",
            "view_authorizations",
            "create_authorizations",
            "manage_authorizations",
        }
        return [f for f in features if f not in blocked]

    return features


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
    features = _filter_features_by_business_type(features, user.business_type)
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