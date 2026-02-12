from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.plan import Plan
from app.modules.plans.schemas import PlanOut

router = APIRouter(prefix="/plans", tags=["Plans"])

@router.get("/", response_model=list[PlanOut])
def list_plans(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Plan).filter(Plan.is_active).offset(skip).limit(limit).all()

@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan

@router.get("/by-name/{plan_name}", response_model=PlanOut)
def get_plan_by_name(plan_name: str, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.name == plan_name).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan
