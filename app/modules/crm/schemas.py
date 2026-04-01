from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class CRMCustomerWithPetCreate(BaseModel):
    customer_full_name: str = Field(min_length=2)
    customer_phone: str | None = None
    customer_email: str | None = None
    customer_notes: str | None = None

    pet_name: str = Field(min_length=1)
    animal_type: str = Field(min_length=1)
    breed: str | None = None
    color_description: str | None = None
    age_years: int | None = None
    age_months: int | None = None
    weight_kg: float | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    microchip: str | None = None
    neutered_spayed: bool | None = None
    allergies: str | None = None
    current_medications: str | None = None
    notes: str | None = None


class CRMCustomerWithPetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    customer_id: int
    pet_id: int
    customer_name: str
    pet_name: str
    animal_type: str


class ConsultationBase(BaseModel):
    customer_id: int
    pet_id: int
    appointment_id: int | None = None
    service_id: int | None = None
    consultation_date: datetime | None = None
    reason: str | None = None
    symptoms: str | None = None
    diagnosis: str | None = None
    treatment_plan: str | None = None
    recommendations: str | None = None
    weight_kg: Decimal | None = None
    temperature_c: Decimal | None = None
    status: str = "open"
    next_visit_at: datetime | None = None


class ConsultationCreate(ConsultationBase):
    pass


class ConsultationUpdate(BaseModel):
    appointment_id: int | None = None
    service_id: int | None = None
    consultation_date: datetime | None = None
    reason: str | None = None
    symptoms: str | None = None
    diagnosis: str | None = None
    treatment_plan: str | None = None
    recommendations: str | None = None
    weight_kg: Decimal | None = None
    temperature_c: Decimal | None = None
    status: str | None = None
    next_visit_at: datetime | None = None


class ConsultationOut(ConsultationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class TreatmentBase(BaseModel):
    consultation_id: int
    pet_id: int
    name: str
    dosage: str | None = None
    frequency: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    status: str = "active"


class TreatmentCreate(TreatmentBase):
    pass


class TreatmentOut(TreatmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class VaccineBase(BaseModel):
    pet_id: int
    consultation_id: int | None = None
    name: str
    application_date: date
    next_due_date: date | None = None
    batch_number: str | None = None
    notes: str | None = None


class VaccineCreate(VaccineBase):
    pass


class VaccineOut(VaccineBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class MedicalRecordBase(BaseModel):
    pet_id: int
    consultation_id: int | None = None
    record_type: str = "clinical_note"
    title: str
    description: str
    attachment_url: str | None = None
    recorded_at: datetime | None = None


class MedicalRecordCreate(MedicalRecordBase):
    pass


class MedicalRecordOut(MedicalRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class PetHistoryOut(BaseModel):
    pet_id: int
    consultations: list[ConsultationOut]
    treatments: list[TreatmentOut]
    vaccines: list[VaccineOut]
    records: list[MedicalRecordOut]


class CRMMetricsOut(BaseModel):
    consultations_total: int
    consultations_period: int
    recurring_clients: int
    service_revenue: list[dict]


class CRMChatRequest(BaseModel):
    question: str


class CRMChatResponse(BaseModel):
    intent: str
    answer: str
    table: dict
    chart: dict
