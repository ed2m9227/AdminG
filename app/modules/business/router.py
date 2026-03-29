from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.business_config import BusinessConfiguration
from app.models.user import User
from app.models.business_types import BusinessType
from app.core.security import get_current_user
from app.modules.business.schemas import (
    BusinessConfigurationOut,
    BusinessConfigurationCreate,
    BusinessConfigurationUpdate,
    BusinessTypeInfo
)

router = APIRouter(prefix="/business", tags=["Business Configuration"])


def resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/types", response_model=list[BusinessTypeInfo])
def get_business_types():
    """Obtener lista de tipos de negocio disponibles"""
    types_info = [
        BusinessTypeInfo(
            type="veterinaria",
            label="Veterinaria",
            description="Clínica veterinaria",
            customer_label="Responsable",
            pet_label="Mascota",
            has_pet=True
        ),
        BusinessTypeInfo(
            type="barberia",
            label="Barbería",
            description="Barbería",
            customer_label="Cliente",
            pet_label=None,
            has_pet=False
        ),
        BusinessTypeInfo(
            type="nutricion",
            label="Nutrición",
            description="Consultorio de nutrición y alimentación",
            customer_label="Paciente",
            pet_label=None,
            has_pet=False
        ),
        BusinessTypeInfo(
            type="peluqueria",
            label="Peluquería",
            description="Salón de peluquería",
            customer_label="Cliente",
            pet_label=None,
            has_pet=False
        ),
        BusinessTypeInfo(
            type="spa",
            label="SPA",
            description="Centro SPA",
            customer_label="Cliente",
            pet_label=None,
            has_pet=False
        ),
        BusinessTypeInfo(
            type="consultorio",
            label="Consultorio Médico",
            description="Consultorio de medicina general",
            customer_label="Paciente",
            pet_label=None,
            has_pet=False
        ),
        BusinessTypeInfo(
            type="clinica",
            label="Clínica",
            description="Clínica médica",
            customer_label="Paciente",
            pet_label=None,
            has_pet=False
        ),
        BusinessTypeInfo(
            type="dentista",
            label="Consultorio Odontológico",
            description="Dentista",
            customer_label="Paciente",
            pet_label=None,
            has_pet=False
        ),
        BusinessTypeInfo(
            type="medicina_general",
            label="Medicina General",
            description="Consulta de medicina general",
            customer_label="Paciente",
            pet_label=None,
            has_pet=False
        ),
        BusinessTypeInfo(
            type="salon",
            label="Salón de Belleza",
            description="Salón de belleza",
            customer_label="Cliente",
            pet_label=None,
            has_pet=False
        ),
        BusinessTypeInfo(
            type="masajes",
            label="Centro de Masajes",
            description="Centro de masoterapia",
            customer_label="Cliente",
            pet_label=None,
            has_pet=False
        ),
        BusinessTypeInfo(
            type="fisioterapia",
            label="Fisioterapia",
            description="Centro de fisioterapia",
            customer_label="Paciente",
            pet_label=None,
            has_pet=False
        ),
        BusinessTypeInfo(
            type="propiedad_horizontal",
            label="Propiedad Horizontal",
            description="Administración de copropiedades, torres y conjuntos",
            customer_label="Residente",
            pet_label=None,
            has_pet=False
        ),
        BusinessTypeInfo(
            type="otro",
            label="Otro",
            description="Otro tipo de negocio",
            customer_label="Cliente",
            pet_label=None,
            has_pet=False
        ),
    ]
    return types_info


@router.post("/config", response_model=BusinessConfigurationOut, status_code=status.HTTP_201_CREATED)
def create_business_config(
    payload: BusinessConfigurationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Crear o actualizar configuración de negocio"""
    # Verificar si ya existe configuración
    existing = db.query(BusinessConfiguration).filter(
        BusinessConfiguration.user_id == current_user.id
    ).first()
    
    if existing:
        # Actualizar existente
        for field, value in payload.model_dump().items():
            if field == 'plan':
                # Update user plan separately
                if value:
                    current_user.plan = value
                    db.add(current_user)
            else:
                setattr(existing, field, value)
        current_user.business_type = existing.business_type
        db.add(current_user)
        db.add(existing)
        db.commit()
        db.refresh(existing)
        db.refresh(current_user)
        return existing
    
    # Obtener defaults para el tipo de negocio
    defaults = BusinessType.get_defaults(payload.business_type)
    
    # Crear nueva configuración
    config = BusinessConfiguration(
        user_id=current_user.id,
        business_type=payload.business_type,
        business_name=payload.business_name,
        business_description=payload.business_description,
        customer_label=defaults.get("customer_label", payload.customer_label),
        pet_label=defaults.get("pet_label"),
        appointment_label=defaults.get("appointment_label", payload.appointment_label),
        pet_fields_enabled=defaults.get("pet_fields_enabled", payload.pet_fields_enabled),
        customer_fields_enabled=payload.customer_fields_enabled,
        custom_fields=payload.custom_fields,
        has_pet_relationship=defaults.get("has_pet_relationship", payload.has_pet_relationship)
    )
    
    # Si viene plan en el payload, actualizar el usuario
    if hasattr(payload, 'plan') and payload.plan:
        current_user.plan = payload.plan
    current_user.business_type = payload.business_type
    db.add(current_user)
    
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@router.get("/config", response_model=BusinessConfigurationOut)
def get_business_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Obtener configuración de negocio del usuario"""
    config = db.query(BusinessConfiguration).filter(
        BusinessConfiguration.user_id == current_user.id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Business configuration not found")
    
    return config


@router.put("/config", response_model=BusinessConfigurationOut)
def update_business_config(
    payload: BusinessConfigurationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Actualizar configuración de negocio"""
    config = db.query(BusinessConfiguration).filter(
        BusinessConfiguration.user_id == current_user.id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Business configuration not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == 'plan':
            # Update user plan separately
            if value:
                current_user.plan = value
                db.add(current_user)
        else:
            setattr(config, field, value)

    if 'business_type' in update_data and update_data['business_type']:
        current_user.business_type = update_data['business_type']
        db.add(current_user)
    
    db.add(config)
    db.commit()
    db.refresh(config)
    db.refresh(current_user)
    return config


@router.post("/config/reset/{business_type}", response_model=BusinessConfigurationOut)
def reset_config_to_defaults(
    business_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user)
):
    """Resetear configuración a defaults de un tipo de negocio"""
    config = db.query(BusinessConfiguration).filter(
        BusinessConfiguration.user_id == current_user.id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Business configuration not found")
    
    # Obtener defaults
    defaults = BusinessType.get_defaults(business_type)
    
    # Resetear
    config.business_type = business_type
    config.customer_label = defaults.get("customer_label", "Cliente")
    config.pet_label = defaults.get("pet_label")
    config.appointment_label = defaults.get("appointment_label", "Cita")
    config.pet_fields_enabled = defaults.get("pet_fields_enabled", {})
    config.has_pet_relationship = defaults.get("has_pet_relationship", False)
    current_user.business_type = business_type
    
    db.add(config)
    db.add(current_user)
    db.commit()
    db.refresh(config)
    return config
