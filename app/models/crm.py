from datetime import datetime
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class Consultation(Base):
    __tablename__ = "crm_consultations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True, index=True)

    consultation_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    reason = Column(String(255), nullable=True)
    symptoms = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    treatment_plan = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    weight_kg = Column(Numeric(10, 2), nullable=True)
    temperature_c = Column(Numeric(4, 1), nullable=True)
    status = Column(String(30), default="open", nullable=False)
    next_visit_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    customer = relationship("Customer", foreign_keys=[customer_id])
    pet = relationship("Pet", foreign_keys=[pet_id])
    appointment = relationship("Appointment", foreign_keys=[appointment_id])
    service = relationship("Service", foreign_keys=[service_id])
    treatments = relationship("Treatment", back_populates="consultation", cascade="all, delete-orphan")
    medical_records = relationship("MedicalRecord", back_populates="consultation", cascade="all, delete-orphan")
    vaccines = relationship("Vaccine", back_populates="consultation")


class Treatment(Base):
    __tablename__ = "crm_treatments"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("crm_consultations.id"), nullable=False, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False, index=True)
    name = Column(String(160), nullable=False)
    dosage = Column(String(120), nullable=True)
    frequency = Column(String(120), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(30), default="active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    consultation = relationship("Consultation", back_populates="treatments")
    pet = relationship("Pet", foreign_keys=[pet_id])


class Vaccine(Base):
    __tablename__ = "crm_vaccines"

    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False, index=True)
    consultation_id = Column(Integer, ForeignKey("crm_consultations.id"), nullable=True, index=True)
    name = Column(String(160), nullable=False)
    application_date = Column(Date, nullable=False)
    next_due_date = Column(Date, nullable=True)
    batch_number = Column(String(120), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    pet = relationship("Pet", foreign_keys=[pet_id])
    consultation = relationship("Consultation", back_populates="vaccines")


class MedicalRecord(Base):
    __tablename__ = "crm_medical_records"

    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False, index=True)
    consultation_id = Column(Integer, ForeignKey("crm_consultations.id"), nullable=True, index=True)
    record_type = Column(String(60), default="clinical_note", nullable=False)
    title = Column(String(180), nullable=False)
    description = Column(Text, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    pet = relationship("Pet", foreign_keys=[pet_id])
    consultation = relationship("Consultation", back_populates="medical_records")
