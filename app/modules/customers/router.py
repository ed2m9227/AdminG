from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.customer import Customer
from app.core.security import get_current_user
from app.core.features import Feature, has_feature
from app.models.user import User
from app.modules.customers.schemas import CustomerCreate, CustomerOut, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["Customers"])


def resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_user_ids_for_data_sharing(user: User, db: Session):
    """Retorna list de user_ids a incluir en queries (para compartir datos padre-hijo)"""
    if user.parent_user_id:
        # Sub-usuario: incluir padre, propio y hermanos
        sibling_ids = [
            uid for (uid,) in db.query(User.id).filter(User.parent_user_id == user.parent_user_id).all()
        ]
        return list(dict.fromkeys([user.parent_user_id, user.id, *sibling_ids]))
    else:
        # Usuario padre/admin: incluir datos propios y de sub-usuarios
        child_ids = [uid for (uid,) in db.query(User.id).filter(User.parent_user_id == user.id).all()]
        return [user.id, *child_ids]

def require_customer_feature(user: User, feature: Feature):
    if has_feature(user.plan, feature, user.role, is_parent_account=not bool(user.parent_user_id)):
        return True
    raise HTTPException(status_code=403, detail="Feature not available in your plan")

@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    require_customer_feature(current_user, Feature.CREATE_CUSTOMERS)
    customer = Customer(
        user_id=current_user.id,
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        notes=payload.notes,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.get("/", response_model=list[CustomerOut])
def list_customers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    require_customer_feature(current_user, Feature.VIEW_CUSTOMERS)
    user_ids = get_user_ids_for_data_sharing(current_user, db)
    return db.query(Customer).filter(
        Customer.user_id.in_(user_ids)
    ).offset(skip).limit(limit).all()

@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    require_customer_feature(current_user, Feature.VIEW_CUSTOMERS)
    user_ids = get_user_ids_for_data_sharing(current_user, db)
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.user_id.in_(user_ids)
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    require_customer_feature(current_user, Feature.EDIT_CUSTOMERS)
    user_ids = get_user_ids_for_data_sharing(current_user, db)
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.user_id.in_(user_ids)
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)

    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    require_customer_feature(current_user, Feature.DELETE_CUSTOMERS)
    user_ids = get_user_ids_for_data_sharing(current_user, db)
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.user_id.in_(user_ids)
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    db.delete(customer)
    db.commit()
    return None
