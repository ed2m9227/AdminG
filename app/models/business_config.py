from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class BusinessConfiguration(Base):
    """
    Configuración personalizada de negocio por usuario.
    Define qué tipo de negocio es y qué campos están habilitados.
    """
    __tablename__ = "business_configurations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # Tipo de negocio
    business_type = Column(String(50), nullable=False, default="veterinaria")  
    # veterinaria, barberia, spa, salon, consultorio, peluqueria, etc
    
    business_name = Column(String(255), nullable=True)
    business_description = Column(Text, nullable=True)
    
    # Etiquetas personalizadas
    customer_label = Column(String(50), nullable=False, default="Cliente")  # "Dueño", "Paciente", etc
    pet_label = Column(String(50), nullable=True, default="Mascota")  # "Mascota", "Paciente", "Animal", etc
    appointment_label = Column(String(50), nullable=False, default="Cita")  # "Cita", "Sesión", "Consulta"
    
    # Campos habilitados para Pet/Entidad relacional (JSON array)
    # Ej: ["name", "animal_type", "breed", "weight_kg", "allergies", "vaccinations"]
    pet_fields_enabled = Column(JSON, nullable=True, default={
        "name": True,
        "animal_type": True,
        "breed": True,
        "weight_kg": True,
        "gender": True,
        "date_of_birth": True,
        "microchip": True,
        "neutered_spayed": True,
        "allergies": True,
        "current_medications": True,
        "last_checkup_date": True,
        "vaccination_status": True,
        "notes": True
    })
    
    # Campos habilitados para Customer
    customer_fields_enabled = Column(JSON, nullable=True, default={
        "full_name": True,
        "phone": True,
        "email": True,
        "notes": True
    })
    
    # Campos personalizados (para futuro)
    custom_fields = Column(JSON, nullable=True, default={})  
    # Ej: { "field_name": { "type": "string", "label": "Mi Campo" } }
    
    # Configuración de relación con Pet
    has_pet_relationship = Column(Boolean, nullable=False, default=True)  # Si usa Pet/Entidad
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    