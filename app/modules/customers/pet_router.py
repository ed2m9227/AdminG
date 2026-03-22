from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.session import get_db
from app.models.pet import Pet
from app.models.customer import Customer
from app.models.user import User
from app.core.security import get_current_user
from app.modules.customers.pet_schemas import PetCreate, PetOut, PetUpdate

router = APIRouter(prefix="/customers/{customer_id}/pets", tags=["Pets"])


def normalize_microchip_value(value: str | None) -> str | None:
    """Normalize empty/generic values to None to avoid fake duplicates like 'Si'/'No'."""
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if normalized.lower() in {"si", "sí", "no", "n/a", "na", "ninguno", "ninguna"}:
        return None
    return normalized


def resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def get_user_ids_for_scope(user: User, db: Session):
    """Shared scope: parent + self + siblings (sub-user) or self + children (parent)."""
    if user.parent_user_id:
        sibling_ids = [
            uid for (uid,) in db.query(User.id).filter(User.parent_user_id == user.parent_user_id).all()
        ]
        return list(dict.fromkeys([user.parent_user_id, user.id, *sibling_ids]))

    child_ids = [uid for (uid,) in db.query(User.id).filter(User.parent_user_id == user.id).all()]
    return [user.id, *child_ids]


def get_customer_or_404(customer_id: int, current_user: User, db: Session):
    """Verify customer exists within the shared parent-child scope."""
    user_ids = get_user_ids_for_scope(current_user, db)
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.user_id.in_(user_ids)
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("/", response_model=PetOut, status_code=status.HTTP_201_CREATED)
def create_pet(
    customer_id: int,
    payload: PetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Create a new pet for a customer"""
    # Verify customer exists and belongs to user
    customer = get_customer_or_404(customer_id, current_user, db)
    
    # Verify customer_id in payload matches URL customer_id
    if payload.customer_id != customer_id:
        raise HTTPException(status_code=400, detail="customer_id mismatch")
    
    pet = Pet(
        customer_id=payload.customer_id,
        name=payload.name,
        animal_type=payload.animal_type,
        breed=payload.breed,
        color_description=payload.color_description,
        age_years=payload.age_years,
        age_months=payload.age_months,
        weight_kg=payload.weight_kg,
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
        microchip=normalize_microchip_value(payload.microchip),
        neutered_spayed=payload.neutered_spayed,
        allergies=payload.allergies,
        current_medications=payload.current_medications,
        last_checkup_date=payload.last_checkup_date,
        vaccination_status=payload.vaccination_status,
        notes=payload.notes
    )
    db.add(pet)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if "pets.microchip" in str(e):
            raise HTTPException(status_code=400, detail="El código de microchip ya existe. Usa un valor único o déjalo vacío.")
        raise
    db.refresh(pet)
    return pet


@router.get("/", response_model=list[PetOut])
def list_pets(
    customer_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """List all pets for a customer"""
    customer = get_customer_or_404(customer_id, current_user, db)
    
    return db.query(Pet).filter(
        Pet.customer_id == customer_id
    ).offset(skip).limit(limit).all()


@router.get("/{pet_id}", response_model=PetOut)
def get_pet(
    customer_id: int,
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Get a specific pet"""
    customer = get_customer_or_404(customer_id, current_user, db)
    
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.customer_id == customer_id
    ).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


@router.put("/{pet_id}", response_model=PetOut)
def update_pet(
    customer_id: int,
    pet_id: int,
    payload: PetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Update a pet"""
    customer = get_customer_or_404(customer_id, current_user, db)
    
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.customer_id == customer_id
    ).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    if "microchip" in update_data:
        update_data["microchip"] = normalize_microchip_value(update_data["microchip"])
    for field, value in update_data.items():
        setattr(pet, field, value)
    
    db.add(pet)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if "pets.microchip" in str(e):
            raise HTTPException(status_code=400, detail="El código de microchip ya existe. Usa un valor único o déjalo vacío.")
        raise
    db.refresh(pet)
    return pet


@router.delete("/{pet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pet(
    customer_id: int,
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Delete a pet"""
    customer = get_customer_or_404(customer_id, current_user, db)
    
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.customer_id == customer_id
    ).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    db.delete(pet)
    db.commit()
