from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.plan import Plan, PlanFeature, PlanLimit
from app.models.user import User

def check_feature_access(feature_code: str):
    """
    Middleware para verificar si el usuario tiene acceso a una feature según su plan.
    Uso: @router.get("/endpoint")
         def endpoint(current_user=Depends(check_feature_access("feature_code"))):
    """
    def verify_feature(
        user_dict: dict = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        # Get user from database
        user = db.query(User).filter(User.id == int(user_dict["id"])).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Get user's plan
        plan = db.query(Plan).filter(Plan.name == user.plan).first()
        if not plan:
            raise HTTPException(status_code=403, detail="Plan not found")

        # Check if feature is enabled in plan
        feature = db.query(PlanFeature).filter(
            PlanFeature.plan_id == plan.id,
            PlanFeature.feature_code == feature_code,
            PlanFeature.is_enabled
        ).first()

        if not feature:
            raise HTTPException(
                status_code=403,
                detail=f"Feature '{feature_code}' not available in your plan '{plan.display_name}'"
            )

        return user_dict

    return verify_feature

def check_plan_limit(limit_name: str):
    """
    Middleware para verificar si el usuario ha alcanzado el límite de su plan.
    Uso: @router.post("/endpoint")
         def endpoint(current_user=Depends(check_plan_limit("max_appointments_per_month"))):
    """
    def verify_limit(
        user_dict: dict = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        user = db.query(User).filter(User.id == int(user_dict["id"])).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        plan = db.query(Plan).filter(Plan.name == user.plan).first()
        if not plan:
            raise HTTPException(status_code=403, detail="Plan not found")

        limit = db.query(PlanLimit).filter(
            PlanLimit.plan_id == plan.id,
            PlanLimit.limit_name == limit_name
        ).first()

        if not limit:
            raise HTTPException(status_code=403, detail=f"Limit '{limit_name}' not defined")

        return user_dict

    return verify_limit
