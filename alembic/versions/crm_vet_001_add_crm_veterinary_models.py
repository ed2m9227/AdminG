"""Add CRM veterinary models

Revision ID: crm_vet_001
Revises: update_plans_001
Create Date: 2026-04-01 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "crm_vet_001"
down_revision: Union[str, None] = "update_plans_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "crm_consultations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("pet_id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=True),
        sa.Column("service_id", sa.Integer(), nullable=True),
        sa.Column("consultation_date", sa.DateTime(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("symptoms", sa.Text(), nullable=True),
        sa.Column("diagnosis", sa.Text(), nullable=True),
        sa.Column("treatment_plan", sa.Text(), nullable=True),
        sa.Column("recommendations", sa.Text(), nullable=True),
        sa.Column("weight_kg", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("temperature_c", sa.Numeric(precision=4, scale=1), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("next_visit_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"]),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"]),
        sa.ForeignKeyConstraint(["pet_id"], ["pets.id"]),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_crm_consultations_id"), "crm_consultations", ["id"], unique=False)
    op.create_index(op.f("ix_crm_consultations_user_id"), "crm_consultations", ["user_id"], unique=False)
    op.create_index(op.f("ix_crm_consultations_customer_id"), "crm_consultations", ["customer_id"], unique=False)
    op.create_index(op.f("ix_crm_consultations_pet_id"), "crm_consultations", ["pet_id"], unique=False)
    op.create_index(op.f("ix_crm_consultations_appointment_id"), "crm_consultations", ["appointment_id"], unique=False)
    op.create_index(op.f("ix_crm_consultations_service_id"), "crm_consultations", ["service_id"], unique=False)
    op.create_index(op.f("ix_crm_consultations_consultation_date"), "crm_consultations", ["consultation_date"], unique=False)

    op.create_table(
        "crm_treatments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("consultation_id", sa.Integer(), nullable=False),
        sa.Column("pet_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("dosage", sa.String(length=120), nullable=True),
        sa.Column("frequency", sa.String(length=120), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["consultation_id"], ["crm_consultations.id"]),
        sa.ForeignKeyConstraint(["pet_id"], ["pets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_crm_treatments_id"), "crm_treatments", ["id"], unique=False)
    op.create_index(op.f("ix_crm_treatments_consultation_id"), "crm_treatments", ["consultation_id"], unique=False)
    op.create_index(op.f("ix_crm_treatments_pet_id"), "crm_treatments", ["pet_id"], unique=False)

    op.create_table(
        "crm_vaccines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pet_id", sa.Integer(), nullable=False),
        sa.Column("consultation_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("application_date", sa.Date(), nullable=False),
        sa.Column("next_due_date", sa.Date(), nullable=True),
        sa.Column("batch_number", sa.String(length=120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["consultation_id"], ["crm_consultations.id"]),
        sa.ForeignKeyConstraint(["pet_id"], ["pets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_crm_vaccines_id"), "crm_vaccines", ["id"], unique=False)
    op.create_index(op.f("ix_crm_vaccines_pet_id"), "crm_vaccines", ["pet_id"], unique=False)
    op.create_index(op.f("ix_crm_vaccines_consultation_id"), "crm_vaccines", ["consultation_id"], unique=False)

    op.create_table(
        "crm_medical_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pet_id", sa.Integer(), nullable=False),
        sa.Column("consultation_id", sa.Integer(), nullable=True),
        sa.Column("record_type", sa.String(length=60), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("attachment_url", sa.String(length=500), nullable=True),
        sa.Column("recorded_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["consultation_id"], ["crm_consultations.id"]),
        sa.ForeignKeyConstraint(["pet_id"], ["pets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_crm_medical_records_id"), "crm_medical_records", ["id"], unique=False)
    op.create_index(op.f("ix_crm_medical_records_pet_id"), "crm_medical_records", ["pet_id"], unique=False)
    op.create_index(op.f("ix_crm_medical_records_consultation_id"), "crm_medical_records", ["consultation_id"], unique=False)
    op.create_index(op.f("ix_crm_medical_records_recorded_at"), "crm_medical_records", ["recorded_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_crm_medical_records_recorded_at"), table_name="crm_medical_records")
    op.drop_index(op.f("ix_crm_medical_records_consultation_id"), table_name="crm_medical_records")
    op.drop_index(op.f("ix_crm_medical_records_pet_id"), table_name="crm_medical_records")
    op.drop_index(op.f("ix_crm_medical_records_id"), table_name="crm_medical_records")
    op.drop_table("crm_medical_records")

    op.drop_index(op.f("ix_crm_vaccines_consultation_id"), table_name="crm_vaccines")
    op.drop_index(op.f("ix_crm_vaccines_pet_id"), table_name="crm_vaccines")
    op.drop_index(op.f("ix_crm_vaccines_id"), table_name="crm_vaccines")
    op.drop_table("crm_vaccines")

    op.drop_index(op.f("ix_crm_treatments_pet_id"), table_name="crm_treatments")
    op.drop_index(op.f("ix_crm_treatments_consultation_id"), table_name="crm_treatments")
    op.drop_index(op.f("ix_crm_treatments_id"), table_name="crm_treatments")
    op.drop_table("crm_treatments")

    op.drop_index(op.f("ix_crm_consultations_consultation_date"), table_name="crm_consultations")
    op.drop_index(op.f("ix_crm_consultations_service_id"), table_name="crm_consultations")
    op.drop_index(op.f("ix_crm_consultations_appointment_id"), table_name="crm_consultations")
    op.drop_index(op.f("ix_crm_consultations_pet_id"), table_name="crm_consultations")
    op.drop_index(op.f("ix_crm_consultations_customer_id"), table_name="crm_consultations")
    op.drop_index(op.f("ix_crm_consultations_user_id"), table_name="crm_consultations")
    op.drop_index(op.f("ix_crm_consultations_id"), table_name="crm_consultations")
    op.drop_table("crm_consultations")
