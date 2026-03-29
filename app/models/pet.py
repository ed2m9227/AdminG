from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text, ForeignKey, Float, Boolean, Date
from sqlalchemy.orm import relationship
from app.db.base import Base

class Pet(Base):
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    
    # Basic Info
    name = Column(String(120), nullable=False)
    animal_type = Column(String(50), nullable=False)  # perro, gato, ave, conejo, etc
    breed = Column(String(120), nullable=True)
    color_description = Column(String(255), nullable=True)
    
    # Physical Info
    age_years = Column(Integer, nullable=True, default=0)
    age_months = Column(Integer, nullable=True, default=0)
    weight_kg = Column(Float, nullable=True)
    gender = Column(String(10), nullable=True)  # M, F, unknown
    
    # Medical Info
    date_of_birth = Column(Date, nullable=True)
    microchip = Column(String(50), nullable=True, unique=True, index=True)
    neutered_spayed = Column(Boolean, nullable=True, default=False)
    allergies = Column(Text, nullable=True)
    current_medications = Column(Text, nullable=True)
    
    # Veterinary Tracking
    last_checkup_date = Column(DateTime, nullable=True)
    vaccination_status = Column(Text, nullable=True)  # JSON o texto de vacunas
    
    # Additional Notes
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="pets")
