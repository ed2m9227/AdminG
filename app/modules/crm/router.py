from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.collaboration import get_scope_user_ids, resolve_collaboration_owner_id
from app.core.features import Feature, has_feature
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.crm import Consultation, MedicalRecord, Treatment, Vaccine
from app.models.customer import Customer
from app.models.pet import Pet
from app.models.user import User
from app.modules.ai.interpreter import detect_intent
from app.modules.ai.query_builder import run_query_for_intent
from app.modules.ai.response_formatter import format_answer, to_table
from app.core.business_registry import VETERINARY_INTENTS
from app.modules.crm.analytics.metrics import get_basic_metrics
from app.modules.crm.schemas import (
    CRMChatRequest,
    CRMChatResponse,
    CRMCustomerWithPetCreate,
    CRMCustomerWithPetOut,
    CRMMetricsOut,
    ConsultationCreate,
    ConsultationOut,
    ConsultationUpdate,
    MedicalRecordCreate,
    MedicalRecordOut,
    PetHistoryOut,
    TreatmentCreate,
    TreatmentOut,
    VaccineCreate,
    VaccineOut,
)

router = APIRouter(prefix="/crm", tags=["CRM"])


def resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def get_user_ids_for_data_sharing(user: User, db: Session) -> list[int]:
    owner_id = resolve_collaboration_owner_id(
        user,
        db,
        allow_external=True,
        allowed_owner_plans={"max", "admin"},
    )
    return get_scope_user_ids(owner_id, db)


def require_crm_feature(user: User, feature: Feature):
    if has_feature(user.plan, feature, user.role, is_parent_account=not bool(user.parent_user_id)):
        return True
    raise HTTPException(status_code=403, detail="Feature not available in your plan")


def ensure_veterinary_business(user: User):
    if (user.business_type or "").strip().lower() != "veterinaria":
        raise HTTPException(status_code=403, detail="CRM veterinario disponible solo para negocios de tipo veterinaria")


@router.post("/clients-with-pet", response_model=CRMCustomerWithPetOut, status_code=status.HTTP_201_CREATED)
def create_customer_with_pet(
    payload: CRMCustomerWithPetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    ensure_veterinary_business(current_user)
    require_crm_feature(current_user, Feature.CREATE_CRM)

    owner_id = resolve_collaboration_owner_id(
        current_user,
        db,
        allow_external=True,
        allowed_owner_plans={"max", "admin"},
    )
    target_user_id = owner_id if (not current_user.parent_user_id and owner_id != current_user.id) else current_user.id

    customer = Customer(
        user_id=target_user_id,
        full_name=payload.customer_full_name,
        phone=payload.customer_phone,
        email=payload.customer_email,
        notes=payload.customer_notes,
    )
    db.add(customer)
    db.flush()

    pet = Pet(
        customer_id=customer.id,
        name=payload.pet_name,
        animal_type=payload.animal_type,
        breed=payload.breed,
        color_description=payload.color_description,
        age_years=payload.age_years,
        age_months=payload.age_months,
        weight_kg=payload.weight_kg,
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
        microchip=payload.microchip,
        neutered_spayed=payload.neutered_spayed,
        allergies=payload.allergies,
        current_medications=payload.current_medications,
        notes=payload.notes,
    )
    db.add(pet)
    db.commit()
    db.refresh(customer)
    db.refresh(pet)

    return CRMCustomerWithPetOut(
        customer_id=customer.id,
        pet_id=pet.id,
        customer_name=customer.full_name,
        pet_name=pet.name,
        animal_type=pet.animal_type,
    )


@router.post("/consultations", response_model=ConsultationOut, status_code=status.HTTP_201_CREATED)
def create_consultation(
    payload: ConsultationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    ensure_veterinary_business(current_user)
    require_crm_feature(current_user, Feature.CREATE_CRM)

    user_ids = get_user_ids_for_data_sharing(current_user, db)

    customer = db.query(Customer).filter(Customer.id == payload.customer_id, Customer.user_id.in_(user_ids)).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    pet = db.query(Pet).filter(Pet.id == payload.pet_id, Pet.customer_id == customer.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    if payload.appointment_id is not None:
        appointment = (
            db.query(Appointment)
            .filter(Appointment.id == payload.appointment_id, Appointment.customer_id == customer.id)
            .first()
        )
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")

    consultation = Consultation(
        user_id=customer.user_id,
        customer_id=payload.customer_id,
        pet_id=payload.pet_id,
        appointment_id=payload.appointment_id,
        service_id=payload.service_id,
        consultation_date=payload.consultation_date or datetime.utcnow(),
        reason=payload.reason,
        symptoms=payload.symptoms,
        diagnosis=payload.diagnosis,
        treatment_plan=payload.treatment_plan,
        recommendations=payload.recommendations,
        weight_kg=payload.weight_kg,
        temperature_c=payload.temperature_c,
        status=payload.status,
        next_visit_at=payload.next_visit_at,
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return consultation


@router.get("/consultations", response_model=list[ConsultationOut])
def list_consultations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    ensure_veterinary_business(current_user)
    require_crm_feature(current_user, Feature.VIEW_CRM)
    user_ids = get_user_ids_for_data_sharing(current_user, db)

    return (
        db.query(Consultation)
        .filter(Consultation.user_id.in_(user_ids))
        .order_by(Consultation.consultation_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.put("/consultations/{consultation_id}", response_model=ConsultationOut)
def update_consultation(
    consultation_id: int,
    payload: ConsultationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    ensure_veterinary_business(current_user)
    require_crm_feature(current_user, Feature.EDIT_CRM)
    user_ids = get_user_ids_for_data_sharing(current_user, db)

    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id,
        Consultation.user_id.in_(user_ids),
    ).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(consultation, field, value)

    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return consultation


@router.post("/treatments", response_model=TreatmentOut, status_code=status.HTTP_201_CREATED)
def create_treatment(
    payload: TreatmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    ensure_veterinary_business(current_user)
    require_crm_feature(current_user, Feature.CREATE_CRM)
    user_ids = get_user_ids_for_data_sharing(current_user, db)

    consultation = db.query(Consultation).filter(
        Consultation.id == payload.consultation_id,
        Consultation.user_id.in_(user_ids),
    ).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    if consultation.pet_id != payload.pet_id:
        raise HTTPException(status_code=400, detail="Pet does not match consultation")

    treatment = Treatment(**payload.model_dump())
    db.add(treatment)
    db.commit()
    db.refresh(treatment)
    return treatment


@router.post("/vaccines", response_model=VaccineOut, status_code=status.HTTP_201_CREATED)
def create_vaccine(
    payload: VaccineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    ensure_veterinary_business(current_user)
    require_crm_feature(current_user, Feature.CREATE_CRM)
    user_ids = get_user_ids_for_data_sharing(current_user, db)

    pet = (
        db.query(Pet)
        .join(Customer, Customer.id == Pet.customer_id)
        .filter(Pet.id == payload.pet_id, Customer.user_id.in_(user_ids))
        .first()
    )
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    vaccine = Vaccine(**payload.model_dump())
    db.add(vaccine)
    db.commit()
    db.refresh(vaccine)
    return vaccine


@router.post("/records", response_model=MedicalRecordOut, status_code=status.HTTP_201_CREATED)
def create_medical_record(
    payload: MedicalRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    ensure_veterinary_business(current_user)
    require_crm_feature(current_user, Feature.CREATE_CRM)
    user_ids = get_user_ids_for_data_sharing(current_user, db)

    pet = (
        db.query(Pet)
        .join(Customer, Customer.id == Pet.customer_id)
        .filter(Pet.id == payload.pet_id, Customer.user_id.in_(user_ids))
        .first()
    )
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    record_data = payload.model_dump()
    if not record_data.get("recorded_at"):
        record_data["recorded_at"] = datetime.utcnow()

    record = MedicalRecord(**record_data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/pets/{pet_id}/history", response_model=PetHistoryOut)
def get_pet_history(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    ensure_veterinary_business(current_user)
    require_crm_feature(current_user, Feature.VIEW_CRM)
    user_ids = get_user_ids_for_data_sharing(current_user, db)

    pet = (
        db.query(Pet)
        .join(Customer, Customer.id == Pet.customer_id)
        .filter(Pet.id == pet_id, Customer.user_id.in_(user_ids))
        .first()
    )
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    consultations = db.query(Consultation).filter(Consultation.pet_id == pet_id, Consultation.user_id.in_(user_ids)).all()
    treatments = db.query(Treatment).filter(Treatment.pet_id == pet_id).all()
    vaccines = db.query(Vaccine).filter(Vaccine.pet_id == pet_id).all()
    records = db.query(MedicalRecord).filter(MedicalRecord.pet_id == pet_id).all()

    return PetHistoryOut(
        pet_id=pet_id,
        consultations=consultations,
        treatments=treatments,
        vaccines=vaccines,
        records=records,
    )


@router.get("/metrics", response_model=CRMMetricsOut)
def get_crm_metrics(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    ensure_veterinary_business(current_user)
    require_crm_feature(current_user, Feature.VIEW_CRM_ANALYTICS)
    user_ids = get_user_ids_for_data_sharing(current_user, db)
    return get_basic_metrics(db, user_ids, days=days)


@router.post("/ai/chat", response_model=CRMChatResponse)
def crm_chat(
    payload: CRMChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(resolve_user),
):
    ensure_veterinary_business(current_user)
    require_crm_feature(current_user, Feature.USE_CRM_AI_CHAT)
    user_ids = get_user_ids_for_data_sharing(current_user, db)

    intent = detect_intent(payload.question, VETERINARY_INTENTS)
    query_result = run_query_for_intent(intent, db, user_ids, business_type="veterinaria")
    rows = query_result.get("rows", [])

    return CRMChatResponse(
        intent=intent,
        answer=format_answer(intent, rows),
        table=to_table(rows),
        chart=query_result.get("chart", {"type": "none", "labels": [], "datasets": []}),
    )


@router.get("/ai/examples")
def crm_chat_examples(
    current_user: User = Depends(resolve_user),
):
    ensure_veterinary_business(current_user)
    return {
        "examples": [
            "Cuantas consultas hubo esta semana?",
            "Mascotas sin visita en 6 meses",
            "Ingresos del mes",
            "Consultas por periodo",
            "Clientes recurrentes",
        ]
    }
