from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.service import Service
from app.models.user import User
from app.core.security import get_current_user
from app.modules.services.schemas import ServiceCreate, ServiceUpdate, ServiceOut

router = APIRouter(prefix="/services", tags=["Services"])


def resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def check_services_access(user: User):
    """Verify user has access to services module - NOT available in free plan"""
    if user.role == "admin":
        return

    # Only paid plans have access to services
    allowed_plans = {
        "basic", "plus", "start", "max", "admin",
        "AdminG_Basic", "AdminG_Plus", 
        "AdminPro_Start", "AdminPro_Max"
    }
    
    if user.plan not in allowed_plans:
        raise HTTPException(
            status_code=403, 
            detail="Services module not available in free plan. Please upgrade to AdminG Basic or higher."
        )


def get_service_limit(user: User) -> int | None:
    limits = {
        "basic": 50,
        "plus": 200,
        "start": 1000,
        "max": 10000,
        "admin": None,
        "AdminG_Basic": 50,
        "AdminG_Plus": 200,
        "AdminPro_Start": 1000,
        "AdminPro_Max": 10000,
    }
    return limits.get(user.plan, None)


@router.post("/", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    check_services_access(current_user)

    limit = get_service_limit(current_user)
    if limit is not None:
        total = db.query(Service).filter(Service.user_id == current_user.id).count()
        if total >= limit:
            raise HTTPException(status_code=403, detail="Service limit reached for your plan")

    service = Service(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        duration_minutes=payload.duration_minutes,
        is_active=payload.is_active,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.get("/", response_model=list[ServiceOut])
def list_services(
    include_inactive: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    check_services_access(current_user)

    query = db.query(Service).filter(Service.user_id == current_user.id)
    if not include_inactive:
        query = query.filter(Service.is_active)

    return query.offset(skip).limit(limit).all()


@router.get("/{service_id}", response_model=ServiceOut)
def get_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    check_services_access(current_user)

    service = db.query(Service).filter(
        Service.id == service_id,
        Service.user_id == current_user.id
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.put("/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    check_services_access(current_user)

    service = db.query(Service).filter(
        Service.id == service_id,
        Service.user_id == current_user.id
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)

    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    check_services_access(current_user)

    service = db.query(Service).filter(
        Service.id == service_id,
        Service.user_id == current_user.id
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    service.is_active = False
    db.add(service)
    db.commit()
    return None
