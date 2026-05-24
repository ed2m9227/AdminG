"""
Módulo I: Identidad Institucional y Legal
Módulo II: Gestión de Dignatarios

Fase 1 - AdminG para JAC
"""

import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.governance import (
    CARGOS_JAC,
    COMITES_JAC,
    Dignitary,
    GovernanceEntity,
    LegalEntity,
)
from app.models.user import User

router = APIRouter(prefix="/identity", tags=["Identity & Dignitaries"])


# =============================================================================
# SCHEMAS
# =============================================================================

class LegalEntityCreate(BaseModel):
    entity_name: str
    nit: Optional[str] = None
    personeria_juridica: Optional[str] = None
    resolucion_reconocimiento: Optional[str] = None
    fecha_resolucion: Optional[datetime] = None
    fecha_vencimiento: Optional[datetime] = None
    estatutos_videntes: bool = False
    libro_afiliados: bool = False
    libro_actas: bool = False
    libro_tesoreria: bool = False
    libro_inventarios: bool = False
    registro_alcaldia: bool = False
    fecha_registro: Optional[datetime] = None
    metadata: Optional[dict] = None


class LegalEntityUpdate(BaseModel):
    entity_name: Optional[str] = None
    nit: Optional[str] = None
    personeria_juridica: Optional[str] = None
    resolucion_reconocimiento: Optional[str] = None
    fecha_resolucion: Optional[datetime] = None
    fecha_vencimiento: Optional[datetime] = None
    estado: Optional[str] = None
    estatutos_videntes: Optional[bool] = None
    libro_afiliados: Optional[bool] = None
    libro_actas: Optional[bool] = None
    libro_tesoreria: Optional[bool] = None
    libro_inventarios: Optional[bool] = None
    registro_alcaldia: Optional[bool] = None
    fecha_registro: Optional[datetime] = None
    metadata: Optional[dict] = None


class DignitaryCreate(BaseModel):
    cargo: str
    cargo_label: str
    nombre_completo: str
    identificacion: Optional[str] = None
    correo: Optional[str] = None
    telefono: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: datetime
    fecha_posesion: Optional[datetime] = None
    acta_eligeion: Optional[str] = None
    observaciones: Optional[str] = None
    user_id: Optional[int] = None


class DignitaryUpdate(BaseModel):
    cargo_label: Optional[str] = None
    nombre_completo: Optional[str] = None
    identificacion: Optional[str] = None
    correo: Optional[str] = None
    telefono: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    fecha_posesion: Optional[datetime] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None
    metadata: Optional[dict] = None


# =============================================================================
# HELPERS
# =============================================================================

def _resolve_user(current_user=Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _get_user_governance_entity(user: User, db: Session) -> Optional[GovernanceEntity]:
    """Obtiene la entidad de gobernanza del usuario."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    return db.query(GovernanceEntity).filter(GovernanceEntity.owner_user_id == owner_user_id).first()


# =============================================================================
# ENDPOINTS: IDENTIDAD LEGAL
# =============================================================================

@router.get("/legal")
def list_legal_entities(
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Lista todas las entidades legales del usuario."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    entities = db.query(LegalEntity).filter(LegalEntity.owner_user_id == owner_user_id).all()
    
    return {
        "items": [
            {
                "id": e.id,
                "entity_name": e.entity_name,
                "nit": e.nit,
                "personeria_juridica": e.personeria_juridica,
                "resolucion_reconocimiento": e.resolucion_reconocimiento,
                "fecha_vencimiento": e.fecha_vencimiento.isoformat() if e.fecha_vencimiento else None,
                "estado": e.estado,
                "estado_verificado": e.estado_verificado,
                "ultimo_verificado_at": e.ultimo_verificado_at.isoformat() if e.ultimo_verificado_at else None,
                "created_at": e.created_at.isoformat(),
            }
            for e in entities
        ]
    }


@router.post("/legal")
def create_legal_entity(
    payload: LegalEntityCreate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Crea una nueva entidad legal."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    governance_entity = _get_user_governance_entity(user, db)
    
    entity = LegalEntity(
        owner_user_id=owner_user_id,
        governance_entity_id=governance_entity.id if governance_entity else None,
        entity_name=payload.entity_name,
        nit=payload.nit,
        personeria_juridica=payload.personeria_juridica,
        resolucion_reconocimiento=payload.resolucion_reconocimiento,
        fecha_resolucion=payload.fecha_resolucion,
        fecha_vencimiento=payload.fecha_vencimiento,
        estatutos_vigentes=payload.estatutos_videntes,
        libro_afiliados=payload.libro_afiliados,
        libro_actas=payload.libro_actas,
        libro_tesoreria=payload.libro_tesoreria,
        libro_inventarios=payload.libro_inventarios,
        registro_alcaldia=payload.registro_alcaldia,
        fecha_registro=payload.fecha_registro,
        metadata_json=json.dumps(payload.metadata) if payload.metadata else None,
    )
    
    db.add(entity)
    db.commit()
    db.refresh(entity)
    
    return {"id": entity.id, "entity_name": entity.entity_name, "success": True}


@router.get("/legal/{entity_id}")
def get_legal_entity(
    entity_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Obtiene una entidad legal específica."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    entity = db.query(LegalEntity).filter(
        LegalEntity.id == entity_id,
        LegalEntity.owner_user_id == owner_user_id,
    ).first()
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entidad legal no encontrada")
    
    return {
        "id": entity.id,
        "entity_name": entity.entity_name,
        "nit": entity.nit,
        "personeria_juridica": entity.personeria_juridica,
        "resolucion_reconocimiento": entity.resolucion_reconocimiento,
        "fecha_resolucion": entity.fecha_resolucion.isoformat() if entity.fecha_resolucion else None,
        "fecha_vencimiento": entity.fecha_vencimiento.isoformat() if entity.fecha_vencimiento else None,
        "estado": entity.estado,
        "estado_verificado": entity.estado_verificado,
        "ultimo_verificado_at": entity.ultimo_verificado_at.isoformat() if entity.ultimo_verificado_at else None,
        "estatutos_vigentes": entity.estatutos_vigentes,
        "libro_afiliados": entity.libro_afiliados,
        "libro_actas": entity.libro_actas,
        "libro_tesoreria": entity.libro_tesoreria,
        "libro_inventarios": entity.libro_inventarios,
        "registro_alcaldia": entity.registro_alcaldia,
        "fecha_registro": entity.fecha_registro.isoformat() if entity.fecha_registro else None,
        "metadata": json.loads(entity.metadata_json) if entity.metadata_json else {},
        "created_at": entity.created_at.isoformat(),
    }


@router.put("/legal/{entity_id}")
def update_legal_entity(
    entity_id: int,
    payload: LegalEntityUpdate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Actualiza una entidad legal."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    entity = db.query(LegalEntity).filter(
        LegalEntity.id == entity_id,
        LegalEntity.owner_user_id == owner_user_id,
    ).first()
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entidad legal no encontrada")
    
    # Actualizar campos
    if payload.entity_name is not None:
        entity.entity_name = payload.entity_name
    if payload.nit is not None:
        entity.nit = payload.nit
    if payload.personeria_juridica is not None:
        entity.personeria_juridica = payload.personeria_juridica
    if payload.resolucion_reconocimiento is not None:
        entity.resolucion_reconocimiento = payload.resolucion_reconocimiento
    if payload.fecha_resolucion is not None:
        entity.fecha_resolucion = payload.fecha_resolucion
    if payload.fecha_vencimiento is not None:
        entity.fecha_vencimiento = payload.fecha_vencimiento
    if payload.estado is not None:
        entity.estado = payload.estado
    if payload.estatutos_videntes is not None:
        entity.estatutos_vigentes = payload.estatutos_videntes
    if payload.libro_afiliados is not None:
        entity.libro_afiliados = payload.libro_afiliados
    if payload.libro_actas is not None:
        entity.libro_actas = payload.libro_actas
    if payload.libro_tesoreria is not None:
        entity.libro_tesoreria = payload.libro_tesoreria
    if payload.libro_inventarios is not None:
        entity.libro_inventarios = payload.libro_inventarios
    if payload.registro_alcaldia is not None:
        entity.registro_alcaldia = payload.registro_alcaldia
    if payload.fecha_registro is not None:
        entity.fecha_registro = payload.fecha_registro
    if payload.metadata is not None:
        entity.metadata_json = json.dumps(payload.metadata)
    
    db.commit()
    db.refresh(entity)
    
    return {"id": entity.id, "entity_name": entity.entity_name, "success": True}


# =============================================================================
# ENDPOINTS: DIGNATARIOS
# =============================================================================

@router.get("/dignitaries")
def list_dignitaries(
    entity_id: Optional[int] = None,
    active_only: bool = True,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Lista los dignatarios."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    query = db.query(Dignitary).filter(Dignitary.creado_por_user_id == owner_user_id)
    
    if entity_id:
        query = query.filter(Dignitary.legal_entity_id == entity_id)
    
    if active_only:
        query = query.filter(Dignitary.periodo_activo == True)
    
    dignitaries = query.order_by(Dignitary.fecha_inicio.desc()).all()
    
    return {
        "items": [
            {
                "id": d.id,
                "cargo": d.cargo,
                "cargo_label": d.cargo_label,
                "nombre_completo": d.nombre_completo,
                "identificacion": d.identificacion,
                "correo": d.correo,
                "telefono": d.telefono,
                "fecha_inicio": d.fecha_inicio.isoformat(),
                "fecha_fin": d.fecha_fin.isoformat(),
                "periodo_activo": d.periodo_activo,
                "estado": d.estado,
            }
            for d in dignitaries
        ],
        "cargos_disponibles": CARGOS_JAC,
    }


@router.post("/dignitaries")
def create_dignitary(
    payload: DignitaryCreate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Crea un nuevo dignatario."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    governance_entity = _get_user_governance_entity(user, db)
    
    # Buscar entidad legal principal
    legal_entity = db.query(LegalEntity).filter(
        LegalEntity.owner_user_id == owner_user_id
    ).first()
    
    dignitary = Dignitary(
        legal_entity_id=legal_entity.id if legal_entity else None,
        governance_entity_id=governance_entity.id if governance_entity else None,
        user_id=payload.user_id,
        owner_user_id=owner_user_id,
        cargo=payload.cargo,
        cargo_label=payload.cargo_label,
        nombre_completo=payload.nombre_completo,
        identificacion=payload.identificacion,
        correo=payload.correo,
        telefono=payload.telefono,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        fecha_posesion=payload.fecha_posesion,
        acta_eligeion=payload.acta_eligeion,
        observaciones=payload.observaciones,
        creado_por_user_id=owner_user_id,
    )
    
    db.add(dignitary)
    db.commit()
    db.refresh(dignitary)
    
    return {"id": dignitary.id, "cargo_label": dignitary.cargo_label, "success": True}


@router.get("/dignitaries/{dignitary_id}")
def get_dignitary(
    dignitary_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Obtiene un dignatario específico."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    dignitary = db.query(Dignitary).filter(
        Dignitary.id == dignitary_id,
        Dignitary.creado_por_user_id == owner_user_id,
    ).first()
    
    if not dignitary:
        raise HTTPException(status_code=404, detail="Dignatario no encontrado")
    
    return {
        "id": dignitary.id,
        "cargo": dignitary.cargo,
        "cargo_label": dignitary.cargo_label,
        "nombre_completo": dignitary.nombre_completo,
        "identificacion": dignitary.identificacion,
        "correo": dignitary.correo,
        "telefono": dignitary.telefono,
        "fecha_inicio": dignitary.fecha_inicio.isoformat(),
        "fecha_fin": dignitary.fecha_fin.isoformat(),
        "fecha_posesion": dignitary.fecha_posesion.isoformat() if dignitary.fecha_posesion else None,
        "periodo_activo": dignitary.periodo_activo,
        "estado": dignitary.estado,
        "acta_eligeion": dignitary.acta_eligeion,
        "observaciones": dignitary.observaciones,
        "metadata": json.loads(dignitary.metadata_json) if dignitary.metadata_json else {},
    }


@router.put("/dignitaries/{dignitary_id}")
def update_dignitary(
    dignitary_id: int,
    payload: DignitaryUpdate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Actualiza un dignatario."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    dignitary = db.query(Dignitary).filter(
        Dignitary.id == dignitary_id,
        Dignitary.creado_por_user_id == owner_user_id,
    ).first()
    
    if not dignitary:
        raise HTTPException(status_code=404, detail="Dignatario no encontrado")
    
    # Actualizar campos
    if payload.cargo_label is not None:
        dignitary.cargo_label = payload.cargo_label
    if payload.nombre_completo is not None:
        dignitary.nombre_completo = payload.nombre_completo
    if payload.identificacion is not None:
        dignitary.identificacion = payload.identificacion
    if payload.correo is not None:
        dignitary.correo = payload.correo
    if payload.telefono is not None:
        dignitary.telefono = payload.telefono
    if payload.fecha_inicio is not None:
        dignitary.fecha_inicio = payload.fecha_inicio
    if payload.fecha_fin is not None:
        dignitary.fecha_fin = payload.fecha_fin
    if payload.fecha_posesion is not None:
        dignitary.fecha_posesion = payload.fecha_posesion
    if payload.estado is not None:
        dignitary.estado = payload.estado
    if payload.observaciones is not None:
        dignitary.observaciones = payload.observaciones
    if payload.metadata is not None:
        dignitary.metadata_json = json.dumps(payload.metadata)
    
    db.commit()
    db.refresh(dignitary)
    
    return {"id": dignitary.id, "cargo_label": dignitary.cargo_label, "success": True}


@router.delete("/dignitaries/{dignitary_id}")
def delete_dignitary(
    dignitary_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Elimina (desactiva) un dignatario."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    dignitary = db.query(Dignitary).filter(
        Dignitary.id == dignitary_id,
        Dignitary.creado_por_user_id == owner_user_id,
    ).first()
    
    if not dignitary:
        raise HTTPException(status_code=404, detail="Dignatario no encontrado")
    
    dignitary.periodo_activo = False
    dignitary.estado = "eliminado"
    db.commit()
    
    return {"success": True, "message": "Dignatario desactivado"}


# =============================================================================
# ENDPOINTS: DASHBOARD EJECUTIVO
# =============================================================================

@router.get("/dashboard")
def get_identity_dashboard(
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Dashboard ejecutivo con semáforo de identidad."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    # Contar entidades legales
    total_legales = db.query(LegalEntity).filter(LegalEntity.owner_user_id == owner_user_id).count()
    
    # Contar dignatarios activos
    total_dignatarios = db.query(Dignitary).filter(
        Dignitary.creado_por_user_id == owner_user_id,
        Dignitary.periodo_activo == True,
    ).count()
    
    # Verificar vencimientos próximos (30 días)
    fecha_limite = datetime.utcnow() + timedelta(days=30)
    entidades_por_vencer = db.query(LegalEntity).filter(
        LegalEntity.owner_user_id == owner_user_id,
        LegalEntity.fecha_vencimiento <= fecha_limite,
        LegalEntity.fecha_vencimiento >= datetime.utcnow(),
    ).count()
    
    # Entidades vencidas
    entidades_vencidas = db.query(LegalEntity).filter(
        LegalEntity.owner_user_id == owner_user_id,
        LegalEntity.fecha_vencimiento < datetime.utcnow(),
    ).count()
    
    # Entidades activas
    entidades_activas = db.query(LegalEntity).filter(
        LegalEntity.owner_user_id == owner_user_id,
        LegalEntity.estado == "activo",
    ).count()
    
    # Determinar estado del semáforo
    # Verde: todo OK | Amarillo: próximo a vencer | Rojo: vencido
    if entidades_vencidas > 0:
        estado_legal = "rojo"
    elif entidades_por_vencer > 0:
        estado_legal = "amarillo"
    else:
        estado_legal = "verde"
    
    return {
        "semaforo": {
            "legal": estado_legal,
            "dignatarios": "verde" if total_dignatarios > 0 else "amarillo",
            "documental": "verde",  # Por implementar
            "proyectos": "verde",  # Por implementar
        },
        "metricas": {
            "total_entidades_legales": total_legales,
            "entidades_activas": entidades_activas,
            "entidades_por_vencer": entidades_por_vencer,
            "entidades_vencidas": entidades_vencidas,
            "total_dignatarios": total_dignatarios,
        },
        "alertas": [
            {
                "tipo": "vencimiento",
                "mensaje": f"{entidades_por_vencer} entidad(es) vencen en los próximos 30 días",
                "prioridad": "alta" if entidades_vencidas > 0 else "media",
            }
        ] if entidades_por_vencer > 0 or entidades_vencidas > 0 else [],
    }


@router.get("/cargos")
def get_cargos_disponibles():
    """Retorna los cargos disponibles para JAC."""
    return {"cargos": CARGOS_JAC, "comites": COMITES_JAC}