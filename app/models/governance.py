from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class GovernanceEntity(Base):
    __tablename__ = "governance_entities"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(180), nullable=False)
    governance_mode = Column(String(40), nullable=False, index=True)
    entity_type = Column(String(60), nullable=False, index=True)
    jurisdiction_code = Column(String(20), nullable=True, index=True)
    territory_code = Column(String(60), nullable=True, index=True)
    hierarchy_path = Column(String(255), nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    owner_user = relationship("User", back_populates="governance_entities")


class PolicyVersion(Base):
    __tablename__ = "policy_versions"

    id = Column(Integer, primary_key=True, index=True)
    policy_type = Column(String(60), nullable=False, index=True)
    version_label = Column(String(40), nullable=False, index=True)
    jurisdiction_code = Column(String(20), nullable=False, default="*", index=True)
    language = Column(String(8), nullable=False, default="es")
    content_hash = Column(String(128), nullable=False)
    content_summary = Column(Text, nullable=True)
    is_mandatory = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    effective_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    effective_to = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user_consents = relationship("UserConsent", back_populates="policy_version")


class ConsentType(Base):
    __tablename__ = "consent_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(80), nullable=False, unique=True, index=True)
    layer = Column(String(20), nullable=False, index=True)  # general | specific | contextual
    purpose = Column(String(180), nullable=False)
    legal_basis_type = Column(String(40), nullable=True)
    module_scope = Column(String(80), nullable=True)
    is_mandatory = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user_consents = relationship("UserConsent", back_populates="consent_type")


class UserConsent(Base):
    __tablename__ = "user_consents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    consent_type_id = Column(Integer, ForeignKey("consent_types.id"), nullable=False, index=True)
    policy_version_id = Column(Integer, ForeignKey("policy_versions.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="active", index=True)  # active | revoked | expired
    source = Column(String(20), nullable=False, default="onboarding")
    accepted_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    evidence_hash = Column(String(128), nullable=True)
    ip_address = Column(String(45), nullable=True)
    device_fingerprint_hash = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="user_consents", foreign_keys=[user_id])
    tenant = relationship("User", foreign_keys=[tenant_id])
    consent_type = relationship("ConsentType", back_populates="user_consents")
    policy_version = relationship("PolicyVersion", back_populates="user_consents")


# =============================================================================
# FASE 1: MODULOS DE IDENTIDAD Y DIGNATARIOS
# =============================================================================

class LegalEntity(Base):
    """Módulo I: Identidad Institucional y Legal
    
    Centraliza la existencia jurídica y operativa de la organización.
    Incluye: personería jurídica, resolución de reconocimiento, estatutos,
    certificados de dignatarios, vigencia legal, IA de vencimientos.
    """
    __tablename__ = "legal_entities"

    id = Column(Integer, primary_key=True, index=True)
    governance_entity_id = Column(Integer, ForeignKey("governance_entities.id"), nullable=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Identidad legal
    entity_name = Column(String(180), nullable=False)
    nit = Column(String(20), nullable=True)
    personeria_juridica = Column(String(40), nullable=True)  # Número de personería
    resolucion_reconocimiento = Column(String(80), nullable=True)
    fecha_resolucion = Column(DateTime, nullable=True)
    fecha_vencimiento = Column(DateTime, nullable=True)
    
    # Estado y cumplimiento
    estado = Column(String(20), nullable=False, default="activo")  # activo, vencido, en_proceso, suspendida
    estado_verificado = Column(Boolean, default=False)
    ultimo_verificado_at = Column(DateTime, nullable=True)
    
    # Documentos de soporte
    estatutos_vigentes = Column(Boolean, default=False)
    libro_afiliados = Column(Boolean, default=False)
    libro_actas = Column(Boolean, default=False)
    libro_tesoreria = Column(Boolean, default=False)
    libro_inventarios = Column(Boolean, default=False)
    
    # Registro ante autoridades
    registro_alcaldia = Column(Boolean, default=False)
    fecha_registro = Column(DateTime, nullable=True)
    renovacion_obligatoria = Column(DateTime, nullable=True)
    
    # Metadata
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    owner_user = relationship("User", foreign_keys=[owner_user_id])
    governance_entity = relationship("GovernanceEntity")


class Dignitary(Base):
    """Módulo II: Gestión de Dignatarios
    
    Administra la estructura de gobierno interno.
    Cargos: Presidente, Vicepresidente, Secretario, Tesorero, Fiscal,
    Coordinadores de comités, Delegados, Vocales, etc.
    """
    __tablename__ = "dignitaries"

    id = Column(Integer, primary_key=True, index=True)
    legal_entity_id = Column(Integer, ForeignKey("legal_entities.id"), nullable=True, index=True)
    governance_entity_id = Column(Integer, ForeignKey("governance_entities.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Si tiene cuenta en el sistema
    
    # Información del cargo
    cargo = Column(String(60), nullable=False, index=True)  # presidente, vicepresidente, etc.
    cargo_label = Column(String(100), nullable=False)  # Label display: "Presidente", "Secretario", etc.
    
    # Datos del dignatario
    nombre_completo = Column(String(180), nullable=False)
    identificacion = Column(String(20), nullable=True)
    correo = Column(String(120), nullable=True)
    telefono = Column(String(20), nullable=True)
    
    # Período
    fecha_posesion = Column(DateTime, nullable=True)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=False)
    periodo_activo = Column(Boolean, default=True, index=True)
    
    # Estado
    estado = Column(String(20), nullable=False, default="activo")  # activo, renuncio, suspendido, completado
    observaciones = Column(Text, nullable=True)
    
    # Trazabilidad
    acta_eligeion = Column(String(80), nullable=True)
    creado_por_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relaciones
    legal_entity = relationship("LegalEntity", foreign_keys=[legal_entity_id])
    governance_entity = relationship("GovernanceEntity", foreign_keys=[governance_entity_id])
    user = relationship("User", foreign_keys=[user_id])
    owner_user = relationship("User", foreign_keys=[owner_user_id])
    creator = relationship("User", foreign_keys=[creado_por_user_id])


# Cargos predefinidos para JAC
CARGOS_JAC = [
    {"code": "presidente", "label": "Presidente", "nivel": 1},
    {"code": "vicepresidente", "label": "Vicepresidente", "nivel": 2},
    {"code": "secretario", "label": "Secretario", "nivel": 3},
    {"code": "tesorero", "label": "Tesorero", "nivel": 3},
    {"code": "fiscal", "label": "Fiscal", "nivel": 3},
    {"code": "vocal_1", "label": "Vocal 1", "nivel": 4},
    {"code": "vocal_2", "label": "Vocal 2", "nivel": 4},
    {"code": "vocal_3", "label": "Vocal 3", "nivel": 4},
    {"code": "coordinador_comite", "label": "Coordinador de Comité", "nivel": 5},
    {"code": "delegado", "label": "Delegado", "nivel": 5},
]

COMITES_JAC = [
    {"code": "ambiental", "label": "Comité Ambiental"},
    {"code": "cultural", "label": "Comité Cultural"},
    {"code": "deportivo", "label": "Comité Deportivo"},
    {"code": "emprendimiento", "label": "Comité de Emprendimiento"},
    {"code": "mujeres", "label": "Comité de Mujeres"},
    {"code": "juventud", "label": "Comité Juvenil"},
    {"code": "convivencia", "label": "Comité de Convivencia"},
    {"code": "seguridad", "label": "Comité de Seguridad"},
    {"code": "educacion", "label": "Comité de Educación"},
    {"code": "salud", "label": "Comité de Salud"},
]


class TrialPolicy(Base):
    __tablename__ = "trial_policies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(80), nullable=False, unique=True, index=True)
    governance_mode = Column(String(40), nullable=True, index=True)
    role_scope = Column(String(40), nullable=True, index=True)
    operation_level = Column(String(40), nullable=True, index=True)
    primary_objective = Column(String(80), nullable=True, index=True)
    duration_days = Column(Integer, nullable=False, default=15)
    approval_mode = Column(String(20), nullable=False, default="auto")  # auto | manual
    module_caps_json = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user_trials = relationship("UserTrial", back_populates="trial_policy")


class UserTrial(Base):
    __tablename__ = "user_trials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    trial_policy_id = Column(Integer, ForeignKey("trial_policies.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="active", index=True)  # active | ended | revoked
    starts_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ends_at = Column(DateTime, nullable=False)
    extension_count = Column(Integer, nullable=False, default=0)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    closure_reason = Column(String(180), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="user_trials", foreign_keys=[user_id])
    tenant = relationship("User", foreign_keys=[tenant_id])
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])
    trial_policy = relationship("TrialPolicy", back_populates="user_trials")


class KeyRotationEvent(Base):
    __tablename__ = "key_rotation_events"

    id = Column(Integer, primary_key=True, index=True)
    key_name = Column(String(80), nullable=False, index=True)
    key_version = Column(String(40), nullable=False, index=True)
    rotated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    rotated_by = relationship("User", foreign_keys=[rotated_by_user_id])
