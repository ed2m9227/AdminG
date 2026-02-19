from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.inventory import InventoryItem, InventoryCategory, InventoryMovement
from app.modules.inventory.schemas import (
    InventoryItemCreate,
    InventoryItemOut,
    InventoryItemUpdate,
    InventoryCategoryCreate,
    InventoryCategoryOut,
    InventoryMovementCreate,
    InventoryMovementOut,
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

# ============ CATEGORIES ============

@router.post("/categories", response_model=InventoryCategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: InventoryCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Create inventory category - Only AdminPro Start/Max"""
    if current_user.plan not in ["start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
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
    if current_user.plan not in ["start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    return db.query(InventoryCategory).filter(
        InventoryCategory.user_id == current_user.id
    ).offset(skip).limit(limit).all()

# ============ ITEMS ============

@router.post("/items", response_model=InventoryItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Create inventory item - Only AdminPro Start/Max"""
    if current_user.plan not in ["start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    # Validate SKU uniqueness
    existing = db.query(InventoryItem).filter(InventoryItem.sku == payload.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
    
    # Validate category if provided
    if payload.category_id:
        category = db.get(InventoryCategory, payload.category_id)
        if not category or category.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Category not found")
    
    item = InventoryItem(
        user_id=current_user.id,
        category_id=payload.category_id,
        name=payload.name,
        sku=payload.sku,
        description=payload.description,
        quantity=payload.quantity,
        min_quantity=payload.min_quantity,
        unit_price=payload.unit_price,
        cost=payload.cost,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("/items", response_model=list[InventoryItemOut])
def list_items(
    skip: int = 0,
    limit: int = 100,
    low_stock: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """List inventory items - Only AdminPro Start/Max
    
    Args:
        low_stock: If True, only return items with quantity <= min_quantity
    """
    if current_user.plan not in ["start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    query = db.query(InventoryItem).filter(InventoryItem.user_id == current_user.id)
    
    if low_stock:
        query = query.filter(InventoryItem.quantity <= InventoryItem.min_quantity)
    
    return query.offset(skip).limit(limit).all()

@router.get("/items/{item_id}", response_model=InventoryItemOut)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    """Get inventory item by ID - Only AdminPro Start/Max"""
    if current_user.plan not in ["start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id == current_user.id
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
    if current_user.plan not in ["start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    
    # Validate SKU uniqueness if changed
    if "sku" in update_data and update_data["sku"] != item.sku:
        existing = db.query(InventoryItem).filter(InventoryItem.sku == update_data["sku"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="SKU already exists")
    
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete inventory item - Only AdminPro Start/Max"""
    if current_user.plan not in ["start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return None

# ============ MOVEMENTS ============

@router.post("/movements", response_model=InventoryMovementOut, status_code=status.HTTP_201_CREATED)
def create_movement(
    payload: InventoryMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record inventory movement (entrada/salida/ajuste)"""
    if current_user.plan not in ["start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    item = db.query(InventoryItem).filter(
        InventoryItem.id == payload.item_id,
        InventoryItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Update item quantity
    if payload.type == "entrada":
        item.quantity += payload.quantity
    elif payload.type == "salida":
        if item.quantity < payload.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        item.quantity -= payload.quantity
    elif payload.type == "ajuste":
        item.quantity = payload.quantity
    
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
    current_user: User = Depends(get_current_user),
):
    """List movements for an item"""
    if current_user.plan not in ["start", "max"]:
        raise HTTPException(status_code=403, detail="Feature not available in your plan")
    
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return db.query(InventoryMovement).filter(
        InventoryMovement.item_id == item_id
    ).offset(skip).limit(limit).all()
