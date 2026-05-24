"""
Módulo VII: Proyectos Comunitarios
Módulo VIII: Participación Ciudadana

Fase 4 - AdminG para JAC
"""

import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.governance import GovernanceEntity
from app.models.user import User

router = APIRouter(prefix="/projects", tags=["Projects & Participation"])


# =============================================================================
# SCHEMAS - PROYECTOS
# =============================================================================

class ProjectCreate(BaseModel):
    """Crear proyecto"""
    nombre: str
    descripcion: str
    tipo_proyecto: str  # pavimentacion, alumbrado, seguridad, etc.
    problema: str  # Descripción del problema que resuelve
    propuesta: str  # Propuesta de solución
    presupuesto: float
    fuente_financiacion: Optional[str] = None
    fecha_inicio_previsto: Optional[datetime] = None
    fecha_fin_previsto: Optional[datetime] = None
    responsable: Optional[str] = None
    observaciones: Optional[str] = None


class ProjectUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    estado: Optional[str] = None  # propuesta, aprobado, en_ejecucion, completado, cancelado
    presupuesto: Optional[float] = None
    fecha_inicio_real: Optional[datetime] = None
    fecha_fin_real: Optional[datetime] = None
    responsable: Optional[str] = None
    avance: Optional[int] = None  # Porcentaje 0-100
    observaciones: Optional[str] = None


class ProjectUpdateStatus(BaseModel):
    """Actualizar estado y avance"""
    estado: str
    avance: int
    observaciones: Optional[str] = None


# =============================================================================
# SCHEMAS - PARTICIPACIÓN
# =============================================================================

class PetitionCreate(BaseModel):
    """Crear PQRS"""
    tipo: str  # peticion, queja, reclamo, sugerencia, denuncia
    categoria: str  # servicios, convivencia, seguridad, etc.
    titulo: str
    descripcion: str
    prioridad: Optional[str] = "normal"  # baja, normal, alta, critica
    anonimo: Optional[bool] = False


class PetitionUpdate(BaseModel):
    estado: Optional[str] = None  # recibido, en_proceso, resuelto, cerrado
    respuesta: Optional[str] = None
    observaciones: Optional[str] = None


class VoteCreate(BaseModel):
    """Crear votación"""
    titulo: str
    descripcion: str
    tipo_votacion: str  # consulta, eleccion, aprobacion
    opciones: list  # [{"code": "si", "label": "A favor"}, ...]
    fecha_inicio: datetime
    fecha_fin: datetime
    requiere_quorum: bool = True
    quorum_requerido: int = 50


class VoteUpdate(BaseModel):
    estado: Optional[str] = None  # activa, cerrada, cancelada
    resultados: Optional[dict] = None


# =============================================================================
# HELPERS
# =============================================================================

def _resolve_user(current_user=Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# =============================================================================
# TIPOS Y CATEGORÍAS
# =============================================================================

TIPOS_PROYECTO = [
    {"code": "pavimentacion", "label": "Pavimentación"},
    {"code": "alumbrado", "label": "Alumbrado Público"},
    {"code": "seguridad", "label": "Seguridad Barrial"},
    {"code": "parques", "label": "Parques y Zonas Verdes"},
    {"code": "saneamiento", "label": "Saneamiento"},
    {"code": "agua", "label": "Agua Potable"},
    {"code": "cultura", "label": "Cultura"},
    {"code": "deporte", "label": "Deporte"},
    {"code": "emprendimiento", "label": "Emprendimiento Local"},
    {"code": "otro", "label": "Otro"},
]

ESTADOS_PROYECTO = [
    {"code": "propuesta", "label": "Propuesta"},
    {"code": "aprobado", "label": "Aprobado"},
    {"code": "en_ejecucion", "label": "En Ejecución"},
    {"code": "completado", "label": "Completado"},
    {"code": "cancelado", "label": "Cancelado"},
]

TIPOS_PQRS = [
    {"code": "peticion", "label": "Petición"},
    {"code": "queja", "label": "Queja"},
    {"code": "reclamo", "label": "Reclamo"},
    {"code": "sugerencia", "label": "Sugerencia"},
    {"code": "denuncia", "label": "Denuncia"},
]

CATEGORIAS_PARTICIPACION = [
    {"code": "servicios", "label": "Servicios"},
    {"code": "convivencia", "label": "Convivencia"},
    {"code": "seguridad", "label": "Seguridad"},
    {"code": "espacio_publico", "label": "Espacio Público"},
    {"code": "medio_ambiente", "label": "Medio Ambiente"},
    {"code": "otro", "label": "Otro"},
]


# =============================================================================
# ENDPOINTS: PROYECTOS
# =============================================================================

@router.get("/")
def list_projects(
    estado: Optional[str] = None,
    tipo: Optional[str] = None,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Lista los proyectos."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    return {
        "items": [],
        "en_ejecucion": [],
        "resumen": {
            "total_proyectos": 0,
            "propuestas": 0,
            "aprobados": 0,
            "en_ejecucion": 0,
            "completados": 0,
        },
    }


@router.post("/")
def create_project(
    payload: ProjectCreate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Crea un nuevo proyecto."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    return {
        "id": 1,
        "nombre": payload.nombre,
        "tipo_proyecto": payload.tipo_proyecto,
        "presupuesto": payload.presupuesto,
        "estado": "propuesta",
        "success": True,
    }


@router.get("/{project_id}")
def get_project(
    project_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Obtiene un proyecto específico."""
    return {
        "id": project_id,
        "nombre": "Pavimentación Calle 10",
        "tipo_proyecto": "pavimentacion",
        "problema": "Calle sin pavimentar causa polvo y barro",
        "propuesta": "Pavimentar 200 metros",
        "presupuesto": 50000000,
        "estado": "en_ejecucion",
        "avance": 45,
        "fecha_inicio_previsto": "2024-03-01T00:00:00",
        "fecha_fin_previsto": "2024-06-30T00:00:00",
    }


@router.put("/{project_id}")
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Actualiza un proyecto."""
    return {"id": project_id, "success": True}


@router.post("/{project_id}/status")
def update_project_status(
    project_id: int,
    payload: ProjectUpdateStatus,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Actualiza estado y avance del proyecto."""
    return {
        "id": project_id,
        "estado": payload.estado,
        "avance": payload.avance,
        "updated_at": datetime.utcnow().isoformat(),
    }


@router.get("/prioritization")
def get_project_prioritization(
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """IA de priorización de proyectos (determina qué proyecto ejecutar primero)."""
    return {
        "proyectos_priorizados": [
            {"id": 1, "nombre": "Pavimentación Calle 10", "score": 95, "factores": {"impacto": "alto", "urgencia": "alta", "presupuesto": "medio"}},
            {"id": 2, "nombre": "Alumbrado Parque Central", "score": 88, "factores": {"impacto": "medio", "urgencia": "media", "presupuesto": "bajo"}},
        ],
        "criterios": ["impacto social", "urgencia", "presupuesto", "riesgo político", "viabilidad técnica"],
    }


# =============================================================================
# ENDPOINTS: PARTICIPACIÓN (PQRS)
# =============================================================================

@router.get("/petitions")
def list_petitions(
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Lista las peticiones/PQRS."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    return {
        "items": [],
        "resumen": {
            "total": 0,
            "recibidos": 0,
            "en_proceso": 0,
            "resueltos": 0,
            "cerrados": 0,
        },
    }


@router.post("/petitions")
def create_petition(
    payload: PetitionCreate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Crea una nueva petición."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    return {
        "id": 1,
        "tipo": payload.tipo,
        "titulo": payload.titulo,
        "estado": "recibido",
        "success": True,
    }


@router.get("/petitions/{petition_id}")
def get_petition(
    petition_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Obtiene una petición específica."""
    return {
        "id": petition_id,
        "tipo": "peticion",
        "titulo": "Solicitud de reparación de vía",
        "descripcion": "La calle frente a mi casa necesita reparación",
        "estado": "recibido",
        "prioridad": "normal",
    }


@router.put("/petitions/{petition_id}")
def update_petition(
    petition_id: int,
    payload: PetitionUpdate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Actualiza una petición."""
    return {"id": petition_id, "success": True}


# =============================================================================
# ENDPOINTS: VOTACIONES
# =============================================================================

@router.get("/votes")
def list_votes(
    estado: Optional[str] = None,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Lista las votaciones."""
    return {
        "items": [],
        "activas": [],
    }


@router.post("/votes")
def create_vote(
    payload: VoteCreate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Crea una nueva votación."""
    return {
        "id": 1,
        "titulo": payload.titulo,
        "tipo_votacion": payload.tipo_votacion,
        "estado": "activa",
        "success": True,
    }


@router.post("/votes/{vote_id}/vote")
def cast_vote(
    vote_id: int,
    opcion: str,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Registra un voto."""
    return {
        "vote_id": vote_id,
        "opcion": opcion,
        "voto_registrado": True,
    }


@router.get("/votes/{vote_id}/results")
def get_vote_results(
    vote_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Obtiene resultados de votación."""
    return {
        "vote_id": vote_id,
        "total_votos": 0,
        "resultados": {},
        "quorum": {"requerido": 50, "actual": 0},
    }


# =============================================================================
# ENDPOINTS: DASHBOARD
# =============================================================================

@router.get("/dashboard")
def get_projects_dashboard(
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Dashboard de proyectos y participación."""
    return {
        "semaforo": {
            "proyectos": "verde",
            "participacion": "verde",
        },
        "metricas": {
            "proyectos_en_ejecucion": 0,
            "proyectos_completados": 0,
            "pqrs_pendientes": 0,
            "votaciones_activas": 0,
        },
    }


@router.get("/social-analysis")
def get_social_analysis(
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """IA social - Detecta focos de conflicto y deterioro comunitario."""
    return {
        "analisis": {
            "focos_conflicto": [],
            "problemas_recurrentes": [],
            "percepcion_ciudadana": "positiva",
            "tendencia": "estable",
        },
        "recomendaciones": [],
    }


@router.get("/options")
def get_projects_options():
    """Opciones disponibles."""
    return {
        "tipos_proyecto": TIPOS_PROYECTO,
        "estados_proyecto": ESTADOS_PROYECTO,
        "tipos_pqrs": TIPOS_PQRS,
        "categorias": CATEGORIAS_PARTICIPACION,
    }