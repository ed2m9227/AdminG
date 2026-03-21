from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.session import get_db
from app.models.inventory import InventoryItem, InventoryCategory, InventoryMovement
from app.models.inventory_package import InventoryPackage, InventoryPackageItem
from app.modules.inventory.schemas import (
    InventoryItemCreate,
    InventoryItemOut,
    InventoryItemUpdate,
    InventoryCategoryCreate,
    InventoryCategoryOut,
    InventoryMovementCreate,
    InventoryMovementOut,
    InventoryPackageCreate,
    InventoryPackageOut,
    InventoryPackageItem,
)
from app.core.plan_permissions import check_feature_access
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
)


def resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_user_ids_for_data_sharing(user: User):
    """Retorna list de user_ids a incluir en queries (para compartir datos padre-hijo)"""
    if user.parent_user_id:
        # Sub-usuario: incluir datos del padre y propio
        return [user.id, user.parent_user_id]
    else:
        # Usuario padre/admin: incluir datos propios
        return [user.id]

def check_inventory_access(user: User):
    """Check if the user can use inventory endpoints.

    Starter plan users should be allowed (legacy name was `start` so we accept
    both), plus any higher tiers or admin roles. This helper is used by all
    inventory routers (categories, items, movements) and previously rejected
    `starter` users due to a typo, leading to 403s on `/inventory/*` and the
    frontend warning modal.
    """
    allowed = ["starter", "start", "pro", "max", "admin"]
    if user.role == 'admin' or user.plan in allowed:
        return True
    raise HTTPException(status_code=403, detail="Feature not available in your plan")


def build_unique_sku(base_sku: str, owner_id: int, db: Session) -> str:
    """Build a globally unique SKU while preserving the original value as much as possible.

    This is a compatibility layer for legacy global UNIQUE(sku) constraint.
    """
    sku = (base_sku or "").strip()
    if not sku:
        return sku

    exists = db.query(InventoryItem).filter(InventoryItem.sku == sku).first()
    if not exists:
        return sku

    candidate = f"{sku}-{owner_id}"
    if not db.query(InventoryItem).filter(InventoryItem.sku == candidate).first():
        return candidate

    seq = 2
    while True:
        candidate = f"{sku}-{owner_id}-{seq}"
        if not db.query(InventoryItem).filter(InventoryItem.sku == candidate).first():
            return candidate
        seq += 1

# ============ CATEGORIES ============

@router.post("/categories", response_model=InventoryCategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: InventoryCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Create inventory category - Only AdminPro Start/Max"""
    check_inventory_access(current_user)
    
    category = InventoryCategory(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.get("/categories", response_model=list[InventoryCategoryOut])
def list_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """List all inventory categories - Only AdminPro Start/Max"""
    check_inventory_access(current_user)
    
    user_ids = get_user_ids_for_data_sharing(current_user)
    return db.query(InventoryCategory).filter(
        InventoryCategory.user_id.in_(user_ids)
    ).offset(skip).limit(limit).all()

# ============ ITEMS ============

@router.post("/items", response_model=InventoryItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Create inventory item (product, service, or package) - Only AdminPro Start/Max
    
    - product: tiene stock controlado
    - service: no tiene stock
    - package: no tiene stock propio, combina items
    """
    check_inventory_access(current_user)
    
    user_ids = get_user_ids_for_data_sharing(current_user)
    normalized_sku = (payload.sku or "").strip() or None  # blank → None, skip uniqueness
    payload.sku = normalized_sku

    if normalized_sku:
        # Validate SKU uniqueness in current scope (parent/child share)
        existing_scope = db.query(InventoryItem).filter(
            InventoryItem.sku == normalized_sku,
            InventoryItem.user_id.in_(user_ids),
        ).first()
        if existing_scope:
            raise HTTPException(status_code=400, detail="SKU already exists")

        # Legacy DB has global UNIQUE(sku). If duplicate exists in another account,
        # auto-adjust SKU to allow creation in this account.
        existing_global = db.query(InventoryItem).filter(InventoryItem.sku == normalized_sku).first()
        if existing_global and existing_global.user_id not in user_ids:
            payload.sku = build_unique_sku(normalized_sku, current_user.id, db)
    
    # Validate category if provided
    if payload.category_id:
        category = db.get(InventoryCategory, payload.category_id)
        if not category or category.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Category not found")
    
    # Validar según tipo de item
    if payload.item_type in ['service', 'package']:
        # Servicios y paquetes no usan stock propio
        quantity = 0
        min_quantity = 0
    else:
        quantity = payload.quantity
        min_quantity = payload.min_quantity
    
    item = InventoryItem(
        user_id=current_user.id,
        category_id=payload.category_id,
        name=payload.name,
        sku=payload.sku,
        description=payload.description,
        quantity=quantity,
        min_quantity=min_quantity,
        unit_price=payload.unit_price,
        cost=payload.cost,
        item_type=payload.item_type,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if "sku" in str(e).lower():
            payload.sku = build_unique_sku(normalized_sku, current_user.id, db)
            item.sku = payload.sku
            db.add(item)
            db.commit()
        else:
            raise
    db.refresh(item)
    return item

@router.get("/items", response_model=list[InventoryItemOut])
def list_items(
    skip: int = 0,
    limit: int = 100,
    low_stock: bool = False,
    item_type: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """List inventory items - Only AdminPro Start/Max
    
    Args:
        low_stock: If True, only return items with quantity <= min_quantity
        item_type: Filter by type (product, service, package)
    """
    check_inventory_access(current_user)
    
    user_ids = get_user_ids_for_data_sharing(current_user)
    query = db.query(InventoryItem).filter(InventoryItem.user_id.in_(user_ids))
    
    if low_stock:
        query = query.filter(InventoryItem.quantity <= InventoryItem.min_quantity)
    
    if item_type:
        query = query.filter(InventoryItem.item_type == item_type)
    
    return query.offset(skip).limit(limit).all()


@router.get("/alerts/low-stock", response_model=list[InventoryItemOut])
def list_low_stock_alerts(
    threshold: int = 5,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """List low stock alerts using a fixed threshold (default: 5)."""
    check_inventory_access(current_user)

    if threshold < 0:
        raise HTTPException(status_code=400, detail="Threshold must be >= 0")

    user_ids = get_user_ids_for_data_sharing(current_user)
    query = db.query(InventoryItem).filter(
        InventoryItem.user_id.in_(user_ids),
        InventoryItem.quantity <= threshold
    )
    return query.order_by(InventoryItem.quantity.asc()).offset(skip).limit(limit).all()

@router.get("/items/{item_id}", response_model=InventoryItemOut)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Get inventory item by ID - Only AdminPro Start/Max"""
    check_inventory_access(current_user)
    
    user_ids = get_user_ids_for_data_sharing(current_user)
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id.in_(user_ids)
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return item

@router.put("/items/{item_id}", response_model=InventoryItemOut)
def update_item(
    item_id: int,
    payload: InventoryItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Update inventory item - Only AdminPro Start/Max"""
    check_inventory_access(current_user)
    
    user_ids = get_user_ids_for_data_sharing(current_user)
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id.in_(user_ids)
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    
    # Validate SKU uniqueness if changed (within owner scope)
    user_ids = get_user_ids_for_data_sharing(current_user)
    if "sku" in update_data and update_data["sku"] != item.sku:
        new_sku = (update_data["sku"] or "").strip() or None  # blank → None
        update_data["sku"] = new_sku
        if new_sku:
            existing = db.query(InventoryItem).filter(
                InventoryItem.sku == new_sku,
                InventoryItem.user_id.in_(user_ids),
                InventoryItem.id != item.id,
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="SKU already exists")

            # Legacy global unique fallback
            existing_global = db.query(InventoryItem).filter(
                InventoryItem.sku == new_sku,
                InventoryItem.id != item.id,
            ).first()
            if existing_global and existing_global.user_id not in user_ids:
                update_data["sku"] = build_unique_sku(new_sku, current_user.id, db)

    # If item_type is changed to service or package, reset stock fields
    if update_data.get("item_type") in ['service', 'package']:
        update_data["quantity"] = 0
        update_data["min_quantity"] = 0

    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.add(item)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if "sku" in str(e).lower() and "sku" in update_data:
            item.sku = build_unique_sku(update_data["sku"], current_user.id, db)
            db.add(item)
            db.commit()
        else:
            raise
    db.refresh(item)
    return item

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Delete inventory item - Only AdminPro Start/Max"""
    check_inventory_access(current_user)
    
    user_ids = get_user_ids_for_data_sharing(current_user)
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id.in_(user_ids)
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return None

# ============ PACKAGES ============


def compute_inventory_package_totals(db: Session, user_id: int, items_payload: list, discount_percentage: float):
    if not items_payload:
        raise HTTPException(status_code=400, detail="Package requires at least one item")
    base_price = 0
    package_items = []
    for entry in items_payload:
        item_id = entry.get("item_id") if isinstance(entry, dict) else entry.item_id
        qty = entry.get("quantity") if isinstance(entry, dict) else entry.quantity
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
        item = db.query(InventoryItem).filter(
            InventoryItem.id == item_id,
            InventoryItem.user_id == user_id
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item not found: {item_id}")
        base_price += float(item.unit_price) * qty
        package_items.append({"item_id": item_id, "quantity": qty})
    if discount_percentage < 0 or discount_percentage > 100:
        raise HTTPException(status_code=400, detail="Discount must be between 0 and 100")
    final_price = base_price * (1 - discount_percentage / 100)
    return round(base_price,2), round(final_price,2), package_items


@router.post("/packages", response_model=InventoryPackageOut, status_code=status.HTTP_201_CREATED)
def create_inventory_package(
    payload: InventoryPackageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Create inventory package (combina productos) - AdminPro Start/Max"""
    check_inventory_access(current_user)
    base, final, pkg_items = compute_inventory_package_totals(
        db, current_user.id, payload.items, payload.discount_percentage
    )
    package = InventoryPackage(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        discount_percentage=payload.discount_percentage,
        base_price=base,
        final_price=final,
        is_active=True,
    )
    db.add(package)
    db.flush()
    for it in pkg_items:
        db.add(InventoryPackageItem(package_id=package.id, item_id=it["item_id"], quantity=it["quantity"]))
    db.commit()
    db.refresh(package)
    return package


@router.get("/packages", response_model=list[InventoryPackageOut])
def list_inventory_packages(
    include_inactive: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    check_inventory_access(current_user)
    query = db.query(InventoryPackage).filter(InventoryPackage.user_id == current_user.id)
    if not include_inactive:
        query = query.filter(InventoryPackage.is_active.is_(True))
    return query.order_by(InventoryPackage.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/packages/{package_id}", response_model=InventoryPackageOut)
def get_inventory_package(
    package_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    check_inventory_access(current_user)
    package = db.query(InventoryPackage).filter(
        InventoryPackage.id == package_id,
        InventoryPackage.user_id == current_user.id,
    ).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return package


@router.put("/packages/{package_id}", response_model=InventoryPackageOut)
def update_inventory_package(
    package_id: int,
    payload: InventoryPackageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    check_inventory_access(current_user)
    package = db.query(InventoryPackage).filter(
        InventoryPackage.id == package_id,
        InventoryPackage.user_id == current_user.id,
    ).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    update_data = payload.model_dump(exclude_unset=True)
    package.name = update_data.get('name', package.name)
    package.description = update_data.get('description', package.description)
    package.discount_percentage = update_data.get('discount_percentage', package.discount_percentage)
    base, final, pkg_items = compute_inventory_package_totals(
        db, current_user.id, update_data.get('items', []), package.discount_percentage
    )
    package.base_price = base
    package.final_price = final
    # reset items
    db.query(InventoryPackageItem).filter(InventoryPackageItem.package_id == package.id).delete()
    for it in pkg_items:
        db.add(InventoryPackageItem(package_id=package.id, item_id=it['item_id'], quantity=it['quantity']))
    db.add(package)
    db.commit()
    db.refresh(package)
    return package


@router.delete("/packages/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_package(
    package_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    check_inventory_access(current_user)
    package = db.query(InventoryPackage).filter(
        InventoryPackage.id == package_id,
        InventoryPackage.user_id == current_user.id,
    ).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    package.is_active = False
    db.add(package)
    db.commit()
    return None


# ============ MOVEMENTS ============

@router.post("/movements", response_model=InventoryMovementOut, status_code=status.HTTP_201_CREATED)
def create_movement(
    payload: InventoryMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Record inventory movement (entrada/salida/ajuste)
    
    Solo productos afectan el stock. Servicios y paquetes no tienen movimientos.
    """
    check_inventory_access(current_user)
    
    item = db.query(InventoryItem).filter(
        InventoryItem.id == payload.item_id,
        InventoryItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Solo productos pueden tener movimientos de inventario
    if item.item_type != 'product':
        raise HTTPException(status_code=400, detail=f"Solo productos pueden tener movimientos. Este es un {item.item_type}.")
    
    # Update item quantity
    if payload.type == "entrada":
        item.quantity += payload.quantity
    elif payload.type == "salida":
        if item.quantity < payload.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        item.quantity -= payload.quantity
    elif payload.type == "ajuste":
        item.quantity = payload.quantity
    else:
        raise HTTPException(status_code=400, detail="Invalid movement type. Use: entrada, salida, ajuste")
    
    # Record movement
    movement = InventoryMovement(
        item_id=payload.item_id,
        type=payload.type,
        quantity=payload.quantity,
        reason=payload.reason,
    )
    
    db.add(item)
    db.add(movement)
    db.commit()
    db.refresh(movement)
    
    return movement

@router.get("/movements/{item_id}", response_model=list[InventoryMovementOut])
def list_movements(
    item_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """List movements for an item"""
    check_inventory_access(current_user)
    
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return db.query(InventoryMovement).filter(
        InventoryMovement.item_id == item_id
    ).offset(skip).limit(limit).all()

# ============ SERVICES ============

@router.get("/services", response_model=list[InventoryItemOut])
def list_services(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """List all services (InventoryItems with type='service')"""
    check_inventory_access(current_user)
    
    user_ids = get_user_ids_for_data_sharing(current_user)
    return db.query(InventoryItem).filter(
        InventoryItem.user_id.in_(user_ids),
        InventoryItem.item_type == 'service',
        InventoryItem.is_active == True
    ).offset(skip).limit(limit).all()

@router.post("/services", response_model=InventoryItemOut, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Create a new service (only parent users)"""
    check_inventory_access(current_user)
    
    # Only parent users can create services
    if current_user.parent_user_id:
        raise HTTPException(status_code=403, detail="Solo el usuario padre puede crear servicios")
    
    # Force item_type to 'service'
    payload.item_type = 'service'
    
    # Generate SKU if not provided
    if not payload.sku:
        sku_base = payload.name.upper()[:3]
        existing = db.query(InventoryItem).filter(
            InventoryItem.sku.like(f'{sku_base}%')
        ).count()
        payload.sku = f"{sku_base}-{existing + 1}"
    
    service = InventoryItem(
        user_id=current_user.id,
        category_id=payload.category_id,
        sku=payload.sku,
        name=payload.name,
        description=payload.description,
        unit_price=payload.unit_price,
        cost=payload.cost,
        quantity=0,  # Services don't have inventory
        item_type='service',
        is_active=True,
    )
    
    db.add(service)
    db.commit()
    db.refresh(service)
    return service

@router.put("/services/{service_id}", response_model=InventoryItemOut)
def update_service(
    service_id: int,
    payload: InventoryItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Update a service (only parent users)"""
    check_inventory_access(current_user)
    
    # Only parent users can edit services
    if current_user.parent_user_id:
        raise HTTPException(status_code=403, detail="Solo el usuario padre puede editar servicios")
    
    service = db.query(InventoryItem).filter(
        InventoryItem.id == service_id,
        InventoryItem.user_id == current_user.id,
        InventoryItem.item_type == 'service'
    ).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    # Don't allow changing type
    if 'item_type' in update_data:
        del update_data['item_type']
    
    for field, value in update_data.items():
        setattr(service, field, value)
    
    db.add(service)
    db.commit()
    db.refresh(service)
    return service

@router.get("/services/{service_id}", response_model=InventoryItemOut)
def get_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Get service details"""
    check_inventory_access(current_user)
    
    user_ids = get_user_ids_for_data_sharing(current_user)
    service = db.query(InventoryItem).filter(
        InventoryItem.id == service_id,
        InventoryItem.user_id.in_(user_ids),
        InventoryItem.item_type == 'service'
    ).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return service

@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Soft delete a service (only parent users)"""
    check_inventory_access(current_user)
    
    # Only parent users can delete services
    if current_user.parent_user_id:
        raise HTTPException(status_code=403, detail="Solo el usuario padre puede eliminar servicios")
    
    service = db.query(InventoryItem).filter(
        InventoryItem.id == service_id,
        InventoryItem.user_id == current_user.id,
        InventoryItem.item_type == 'service'
    ).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service.is_active = False
    db.add(service)
    db.commit()
    return None
