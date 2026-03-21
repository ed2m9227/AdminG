from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.service import Service
from app.models.service_package import ServicePackage, ServicePackageItem
from app.models.user import User
from app.modules.services.schemas import (
    ServiceCreate,
    ServiceOut,
    ServicePackageCreate,
    ServicePackageOut,
    ServicePackageUpdate,
    ServiceUpdate,
)

router = APIRouter(prefix="/services", tags=["Services"])


def resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def get_user_ids_for_data_sharing(user: User):
    if user.parent_user_id:
        parent = user.sub_users
        sibling_ids = [child.id for child in (parent.parent_user or [])] if parent else []
        return list(dict.fromkeys([user.parent_user_id, user.id, *sibling_ids]))

    child_ids = [child.id for child in (user.parent_user or [])]
    return [user.id, *child_ids]


def check_services_access(user: User):
    """Verify user has access to services module - NOT available in free plan."""
    if user.role == "admin":
        return

    allowed_plans = {
        "starter", "pro", "max", "admin",
        "basic", "plus", "start",
        "AdminG_Basic", "AdminG_Plus",
        "AdminPro_Start", "AdminPro_Max",
    }

    if user.plan not in allowed_plans:
        raise HTTPException(
            status_code=403,
            detail="Services module not available in free plan. Please upgrade to Starter or higher.",
        )


def get_service_limit(user: User) -> int | None:
    limits = {
        "starter": 50,
        "pro": 200,
        "max": 1000,
        "admin": None,
        "basic": 50,
        "plus": 200,
        "start": 200,
        "AdminG_Basic": 50,
        "AdminG_Plus": 200,
        "AdminPro_Start": 200,
        "AdminPro_Max": 1000,
    }
    return limits.get(user.plan, None)


def compute_package_totals(
    db: Session,
    user_id: int,
    items_payload: list,
    discount_percentage: Decimal,
):
    if not items_payload:
        raise HTTPException(status_code=400, detail="Package requires at least one service")

    base_price = Decimal("0")
    package_items = []

    for item in items_payload:
        service_id = item.get("service_id") if isinstance(item, dict) else item.service_id
        quantity = item.get("quantity") if isinstance(item, dict) else item.quantity

        service = db.query(Service).filter(
            Service.id == service_id,
            Service.user_id == user_id,
            Service.is_active.is_(True),
        ).first()
        if not service:
            raise HTTPException(status_code=404, detail=f"Service not found: {service_id}")
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than 0")

        base_price += Decimal(service.price) * Decimal(quantity)
        package_items.append({"service_id": service.id, "quantity": quantity})

    if discount_percentage < 0 or discount_percentage > 100:
        raise HTTPException(status_code=400, detail="Discount must be between 0 and 100")

    final_price = base_price * (Decimal("1") - (Decimal(discount_percentage) / Decimal("100")))
    return base_price.quantize(Decimal("0.01")), final_price.quantize(Decimal("0.01")), package_items


@router.post("/", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
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
    current_user: User = Depends(resolve_user),
):
    check_services_access(current_user)

    user_ids = get_user_ids_for_data_sharing(current_user)
    query = db.query(Service).filter(Service.user_id.in_(user_ids))
    if not include_inactive:
        query = query.filter(Service.is_active)

    return query.offset(skip).limit(limit).all()


@router.get("/{service_id}", response_model=ServiceOut)
def get_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    check_services_access(current_user)

    user_ids = get_user_ids_for_data_sharing(current_user)

    service = db.query(Service).filter(
        Service.id == service_id,
        Service.user_id.in_(user_ids),
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.put("/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    check_services_access(current_user)

    service = db.query(Service).filter(
        Service.id == service_id,
        Service.user_id == current_user.id,
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
    current_user: User = Depends(resolve_user),
):
    check_services_access(current_user)

    service = db.query(Service).filter(
        Service.id == service_id,
        Service.user_id == current_user.id,
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    service.is_active = False
    db.add(service)
    db.commit()
    return None


@router.post("/packages", response_model=ServicePackageOut, status_code=status.HTTP_201_CREATED)
def create_service_package(
    payload: ServicePackageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    check_services_access(current_user)
    base_price, final_price, package_items = compute_package_totals(
        db,
        current_user.id,
        payload.items,
        Decimal(payload.discount_percentage),
    )

    package = ServicePackage(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        discount_percentage=payload.discount_percentage,
        base_price=base_price,
        final_price=final_price,
        is_active=payload.is_active,
    )
    db.add(package)
    db.flush()

    for item in package_items:
        db.add(ServicePackageItem(package_id=package.id, service_id=item["service_id"], quantity=item["quantity"]))

    db.commit()
    db.refresh(package)
    return package


@router.get("/packages", response_model=list[ServicePackageOut])
def list_service_packages(
    include_inactive: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    check_services_access(current_user)
    query = db.query(ServicePackage).filter(ServicePackage.user_id == current_user.id)
    if not include_inactive:
        query = query.filter(ServicePackage.is_active.is_(True))
    return query.order_by(ServicePackage.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/packages/{package_id}", response_model=ServicePackageOut)
def get_service_package(
    package_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    check_services_access(current_user)
    package = db.query(ServicePackage).filter(
        ServicePackage.id == package_id,
        ServicePackage.user_id == current_user.id,
    ).first()
    if not package:
        raise HTTPException(status_code=404, detail="Service package not found")
    return package


@router.put("/packages/{package_id}", response_model=ServicePackageOut)
def update_service_package(
    package_id: int,
    payload: ServicePackageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    check_services_access(current_user)
    package = db.query(ServicePackage).filter(
        ServicePackage.id == package_id,
        ServicePackage.user_id == current_user.id,
    ).first()
    if not package:
        raise HTTPException(status_code=404, detail="Service package not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data:
        package.name = update_data["name"]
    if "description" in update_data:
        package.description = update_data["description"]
    if "is_active" in update_data:
        package.is_active = update_data["is_active"]

    discount = Decimal(update_data.get("discount_percentage", package.discount_percentage))
    items = update_data.get("items")

    if items is not None:
        base_price, final_price, package_items = compute_package_totals(db, current_user.id, items, discount)
        package.discount_percentage = discount
        package.base_price = base_price
        package.final_price = final_price

        db.query(ServicePackageItem).filter(ServicePackageItem.package_id == package.id).delete()
        for item in package_items:
            db.add(ServicePackageItem(package_id=package.id, service_id=item["service_id"], quantity=item["quantity"]))
    elif "discount_percentage" in update_data:
        package.discount_percentage = discount
        package.final_price = (
            Decimal(package.base_price) * (Decimal("1") - discount / Decimal("100"))
        ).quantize(Decimal("0.01"))

    db.add(package)
    db.commit()
    db.refresh(package)
    return package


@router.delete("/packages/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service_package(
    package_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    check_services_access(current_user)
    package = db.query(ServicePackage).filter(
        ServicePackage.id == package_id,
        ServicePackage.user_id == current_user.id,
    ).first()
    if not package:
        raise HTTPException(status_code=404, detail="Service package not found")

    package.is_active = False
    db.add(package)
    db.commit()
    return None
