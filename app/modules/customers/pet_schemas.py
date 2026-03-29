from datetime import datetime, date
from pydantic import BaseModel, ConfigDict

class PetBase(BaseModel):
    name: str
    animal_type: str
    breed: str | None = None
    color_description: str | None = None
    age_years: int | None = None
    age_months: int | None = None
    weight_kg: float | None = None
    gender: str | None = None  # M, F, unknown
    date_of_birth: date | None = None
    microchip: str | None = None
    neutered_spayed: bool | None = False
    allergies: str | None = None
    current_medications: str | None = None
    last_checkup_date: datetime | None = None
    vaccination_status: str | None = None
    notes: str | None = None

class PetCreate(PetBase):
    customer_id: int

class PetUpdate(BaseModel):
    name: str | None = None
    animal_type: str | None = None
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
    last_checkup_date: datetime | None = None
    vaccination_status: str | None = None
    notes: str | None = None

class PetOut(PetBase):
    id: int
    customer_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CustomerWithPets(BaseModel):
    id: int
    full_name: str
    phone: str | None = None
    email: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    pets: list[PetOut] = []

    model_config = ConfigDict(from_attributes=True)
