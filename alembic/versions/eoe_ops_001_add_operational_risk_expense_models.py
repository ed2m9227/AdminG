"""EOE operations: add operational, risk, incident and expense tables

Revision ID: eoe_ops_001
Revises: crm_vet_001
Create Date: 2026-04-03 23:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "eoe_ops_001"
down_revision: Union[str, None] = "crm_vet_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return any(ix.get("name") == index_name for ix in inspector.get_indexes(table_name))


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if not _table_exists(inspector, "operational_unit_types"):
        op.create_table(
            "operational_unit_types",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("code", sa.String(length=40), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("1"), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code"),
        )
        op.create_index("ix_operational_unit_types_id", "operational_unit_types", ["id"], unique=False)
        op.create_index("ix_operational_unit_types_code", "operational_unit_types", ["code"], unique=False)

    if not _table_exists(inspector, "operational_units"):
        op.create_table(
            "operational_units",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("type_id", sa.Integer(), nullable=True),
            sa.Column("code", sa.String(length=80), nullable=True),
            sa.Column("title", sa.String(length=180), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=30), nullable=False),
            sa.Column("risk_capable", sa.Boolean(), server_default=sa.text("0"), nullable=False),
            sa.Column("compliance_capable", sa.Boolean(), server_default=sa.text("0"), nullable=False),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["tenant_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["type_id"], ["operational_unit_types.id"]),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_operational_units_id", "operational_units", ["id"], unique=False)
        op.create_index("ix_operational_units_tenant_id", "operational_units", ["tenant_id"], unique=False)
        op.create_index("ix_operational_units_code", "operational_units", ["code"], unique=False)

    if not _table_exists(inspector, "operational_contexts"):
        op.create_table(
            "operational_contexts",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("unit_id", sa.Integer(), nullable=False),
            sa.Column("channel_origin", sa.String(length=30), nullable=False),
            sa.Column("actor_type", sa.String(length=30), nullable=False),
            sa.Column("actor_id", sa.Integer(), nullable=True),
            sa.Column("location", sa.String(length=160), nullable=True),
            sa.Column("occurred_at", sa.DateTime(), nullable=False),
            sa.Column("risk_level_snapshot", sa.String(length=30), nullable=True),
            sa.Column("related_entities_json", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["unit_id"], ["operational_units.id"]),
            sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_operational_contexts_id", "operational_contexts", ["id"], unique=False)
        op.create_index("ix_operational_contexts_unit_id", "operational_contexts", ["unit_id"], unique=False)

    if not _table_exists(inspector, "operational_events"):
        op.create_table(
            "operational_events",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("unit_id", sa.Integer(), nullable=True),
            sa.Column("event_type", sa.String(length=60), nullable=False),
            sa.Column("severity", sa.String(length=20), nullable=False),
            sa.Column("probability_score", sa.Numeric(10, 4), server_default="0", nullable=False),
            sa.Column("impact_score", sa.Numeric(10, 4), server_default="0", nullable=False),
            sa.Column("risk_score", sa.Numeric(10, 4), server_default="0", nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("trigger_source", sa.String(length=30), nullable=False),
            sa.Column("payload_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("closed_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["tenant_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["unit_id"], ["operational_units.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_operational_events_id", "operational_events", ["id"], unique=False)
        op.create_index("ix_operational_events_tenant_id", "operational_events", ["tenant_id"], unique=False)
        op.create_index("ix_operational_events_unit_id", "operational_events", ["unit_id"], unique=False)
        op.create_index("ix_operational_events_event_type", "operational_events", ["event_type"], unique=False)

    if not _table_exists(inspector, "risk_registry"):
        op.create_table(
            "risk_registry",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("area", sa.String(length=120), nullable=False),
            sa.Column("risk_type", sa.String(length=80), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("probability_level", sa.Integer(), nullable=False),
            sa.Column("impact_level", sa.Integer(), nullable=False),
            sa.Column("risk_level_auto", sa.Integer(), nullable=False),
            sa.Column("category", sa.String(length=20), nullable=False),
            sa.Column("owner_user_id", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["tenant_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_risk_registry_id", "risk_registry", ["id"], unique=False)
        op.create_index("ix_risk_registry_tenant_id", "risk_registry", ["tenant_id"], unique=False)
        op.create_index("ix_risk_registry_area", "risk_registry", ["area"], unique=False)
        op.create_index("ix_risk_registry_risk_type", "risk_registry", ["risk_type"], unique=False)
        op.create_index("ix_risk_registry_risk_level_auto", "risk_registry", ["risk_level_auto"], unique=False)
        op.create_index("ix_risk_registry_category", "risk_registry", ["category"], unique=False)

    if not _table_exists(inspector, "risk_assessments"):
        op.create_table(
            "risk_assessments",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("risk_id", sa.Integer(), nullable=False),
            sa.Column("audit_date", sa.DateTime(), nullable=False),
            sa.Column("auditor_user_id", sa.Integer(), nullable=True),
            sa.Column("evidence_json", sa.Text(), nullable=True),
            sa.Column("recommendation", sa.Text(), nullable=True),
            sa.Column("compliance_score", sa.Numeric(10, 4), nullable=True),
            sa.Column("next_review_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["risk_id"], ["risk_registry.id"]),
            sa.ForeignKeyConstraint(["auditor_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_risk_assessments_id", "risk_assessments", ["id"], unique=False)
        op.create_index("ix_risk_assessments_risk_id", "risk_assessments", ["risk_id"], unique=False)

    if not _table_exists(inspector, "incidents"):
        op.create_table(
            "incidents",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("event_id", sa.Integer(), nullable=True),
            sa.Column("risk_id", sa.Integer(), nullable=True),
            sa.Column("area", sa.String(length=120), nullable=False),
            sa.Column("incident_type", sa.String(length=40), nullable=False),
            sa.Column("injured_people_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("lost_days", sa.Integer(), server_default="0", nullable=False),
            sa.Column("direct_cost", sa.Numeric(12, 2), server_default="0", nullable=False),
            sa.Column("indirect_cost", sa.Numeric(12, 2), server_default="0", nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("root_cause", sa.Text(), nullable=True),
            sa.Column("report_channel", sa.String(length=30), nullable=False),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["tenant_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["event_id"], ["operational_events.id"]),
            sa.ForeignKeyConstraint(["risk_id"], ["risk_registry.id"]),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_incidents_id", "incidents", ["id"], unique=False)
        op.create_index("ix_incidents_tenant_id", "incidents", ["tenant_id"], unique=False)
        op.create_index("ix_incidents_event_id", "incidents", ["event_id"], unique=False)
        op.create_index("ix_incidents_risk_id", "incidents", ["risk_id"], unique=False)
        op.create_index("ix_incidents_area", "incidents", ["area"], unique=False)
        op.create_index("ix_incidents_incident_type", "incidents", ["incident_type"], unique=False)

    if not _table_exists(inspector, "action_plans"):
        op.create_table(
            "action_plans",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("incident_id", sa.Integer(), nullable=True),
            sa.Column("risk_id", sa.Integer(), nullable=True),
            sa.Column("title", sa.String(length=180), nullable=False),
            sa.Column("owner_user_id", sa.Integer(), nullable=True),
            sa.Column("due_date", sa.DateTime(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("progress_pct", sa.Integer(), server_default="0", nullable=False),
            sa.Column("estimated_cost", sa.Numeric(12, 2), server_default="0", nullable=False),
            sa.Column("actual_cost", sa.Numeric(12, 2), server_default="0", nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"]),
            sa.ForeignKeyConstraint(["risk_id"], ["risk_registry.id"]),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_action_plans_id", "action_plans", ["id"], unique=False)
        op.create_index("ix_action_plans_incident_id", "action_plans", ["incident_id"], unique=False)
        op.create_index("ix_action_plans_risk_id", "action_plans", ["risk_id"], unique=False)

    if not _table_exists(inspector, "expenses"):
        op.create_table(
            "expenses",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("employee_id", sa.Integer(), nullable=True),
            sa.Column("category", sa.String(length=40), nullable=False),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("currency", sa.String(length=10), nullable=False),
            sa.Column("expense_date", sa.DateTime(), nullable=False),
            sa.Column("channel_origin", sa.String(length=30), nullable=False),
            sa.Column("related_event_id", sa.Integer(), nullable=True),
            sa.Column("related_incident_id", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("receipt_url", sa.String(length=400), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["tenant_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["employee_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["related_event_id"], ["operational_events.id"]),
            sa.ForeignKeyConstraint(["related_incident_id"], ["incidents.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_expenses_id", "expenses", ["id"], unique=False)
        op.create_index("ix_expenses_tenant_id", "expenses", ["tenant_id"], unique=False)
        op.create_index("ix_expenses_employee_id", "expenses", ["employee_id"], unique=False)
        op.create_index("ix_expenses_category", "expenses", ["category"], unique=False)
        op.create_index("ix_expenses_related_event_id", "expenses", ["related_event_id"], unique=False)
        op.create_index("ix_expenses_related_incident_id", "expenses", ["related_incident_id"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    for table, indexes in [
        ("expenses", [
            "ix_expenses_related_incident_id",
            "ix_expenses_related_event_id",
            "ix_expenses_category",
            "ix_expenses_employee_id",
            "ix_expenses_tenant_id",
            "ix_expenses_id",
        ]),
        ("action_plans", [
            "ix_action_plans_risk_id",
            "ix_action_plans_incident_id",
            "ix_action_plans_id",
        ]),
        ("incidents", [
            "ix_incidents_incident_type",
            "ix_incidents_area",
            "ix_incidents_risk_id",
            "ix_incidents_event_id",
            "ix_incidents_tenant_id",
            "ix_incidents_id",
        ]),
        ("risk_assessments", [
            "ix_risk_assessments_risk_id",
            "ix_risk_assessments_id",
        ]),
        ("risk_registry", [
            "ix_risk_registry_category",
            "ix_risk_registry_risk_level_auto",
            "ix_risk_registry_risk_type",
            "ix_risk_registry_area",
            "ix_risk_registry_tenant_id",
            "ix_risk_registry_id",
        ]),
        ("operational_events", [
            "ix_operational_events_event_type",
            "ix_operational_events_unit_id",
            "ix_operational_events_tenant_id",
            "ix_operational_events_id",
        ]),
        ("operational_contexts", [
            "ix_operational_contexts_unit_id",
            "ix_operational_contexts_id",
        ]),
        ("operational_units", [
            "ix_operational_units_code",
            "ix_operational_units_tenant_id",
            "ix_operational_units_id",
        ]),
        ("operational_unit_types", [
            "ix_operational_unit_types_code",
            "ix_operational_unit_types_id",
        ]),
    ]:
        if _table_exists(inspector, table):
            for idx in indexes:
                if _index_exists(inspector, table, idx):
                    op.drop_index(idx, table_name=table)
            op.drop_table(table)
