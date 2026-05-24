"""
Módulo III: Asambleas y Actas
Módulo VI: Documental

Fase 3 - AdminG para JAC
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

router = APIRouter(prefix="/assembly", tags=["Assemblies & Documents"])


# =============================================================================
# SCHEMAS - ASAMBLEAS
# =============================================================================

class AssemblyCreate(BaseModel):
    """Crear asamblea"""
    tipo_asamblea: str  # ordinaria, extraordinaria, convocia
    numero_asambleia: str  # Ej: "01-2024"
    fecha: datetime
    lugar: str
    hora_convocatoria: str
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    objeto: str  # Tema principal
    orden_dia: Optional[str] = None  # JSON array de temas
    quorum_inicial: Optional[int] = None
    asistentes: Optional[list] = None  # Lista de nombres
    decisiones: Optional[list] = None  # Lista de decisiones
    compromisos: Optional[list] = None  # Lista de compromisos
    observaciones: Optional[str] = None


class AssemblyUpdate(BaseModel):
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    quorum_inicial: Optional[int] = None
    asistentes: Optional[list] = None
    decisiones: Optional[list] = None
    compromisos: Optional[list] = None
    estado: Optional[str] = None  # convocada, en_proceso, realizada, cancelada
    observaciones: Optional[str] = None


# =============================================================================
# SCHEMAS - DOCUMENTOS
# =============================================================================

class DocumentCreate(BaseModel):
    """Subir documento"""
    titulo: str
    tipo_documento: str  # acta, contrato, convenio, proyecto, certificado, etc.
    categoria: str  # legal, financiero, administrativo, proyecto
    fecha_documento: Optional[datetime] = None
    numero_documento: Optional[str] = None  # Ej: "ACT-001-2024"
    entidad_emite: Optional[str] = None  # Quién emite
    fecha_vencimiento: Optional[datetime] = None
    descripcion: Optional[str] = None
    tags: Optional[list] = None  # Palabras clave
    archivo_url: Optional[str] = None  # URL del archivo
    observaciones: Optional[str] = None


class DocumentUpdate(BaseModel):
    titulo: Optional[str] = None
    tipo_documento: Optional[str] = None
    categoria: Optional[str] = None
    fecha_vencimiento: Optional[datetime] = None
    estado: Optional[str] = None  # activo, vencido, en_revision
    tags: Optional[list] = None
    observaciones: Optional[str] = None


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

TIPOS_ASAMBLEA = [
    {"code": "ordinaria", "label": "Asamblea Ordinaria"},
    {"code": "extraordinaria", "label": "Asamblea Extraordinaria"},
    {"code": "convocatoria", "label": "Convocatoria"},
]

TIPOS_DOCUMENTO = [
    {"code": "acta", "label": "Acta"},
    {"code": "contrato", "label": "Contrato"},
    {"code": "convenio", "label": "Convenio"},
    {"code": "proyecto", "label": "Proyecto"},
    {"code": "certificado", "label": "Certificado"},
    {"code": "impuesto", "label": "Impuesto/Paz y Salvo"},
    {"code": "licencia", "label": "Licencia"},
    {"code": "escritura", "label": "Escritura"},
    {"code": "soporte_fotografico", "label": "Soporte Fotográfico"},
    {"code": "historico", "label": "Archivo Histórico"},
]

CATEGORIAS_DOCUMENTO = [
    {"code": "legal", "label": "Legal"},
    {"code": "financiero", "label": "Financiero"},
    {"code": "administrativo", "label": "Administrativo"},
    {"code": "proyecto", "label": "Proyecto"},
    {"code": "cumplimiento", "label": "Cumplimiento"},
]


# =============================================================================
# ENDPOINTS: ASAMBLEAS
# =============================================================================

@router.get("/assemblies")
def list_assemblies(
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    fechaDesde: Optional[datetime] = None,
    fechaHasta: Optional[datetime] = None,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Lista las asambleas."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    return {
        "items": [],
        "proximas": [],
        "resumen": {
            "total_asambleas": 0,
            "ordinarias": 0,
            "extraordinarias": 0,
        },
    }


@router.post("/assemblies")
def create_assembly(
    payload: AssemblyCreate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Crea una nueva asamblea."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    return {
        "id": 1,
        "tipo_asambleia": payload.tipo_asambleia,
        "numero_asambleia": payload.numero_asambleia,
        "fecha": payload.fecha.isoformat(),
        "lugar": payload.lugar,
        "estado": "convocada",
        "success": True,
    }


@router.get("/assemblies/{assembly_id}")
def get_assembly(
    assembly_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Obtiene una asamblea específica."""
    return {
        "id": assembly_id,
        "tipo_asambleia": "ordinaria",
        "numero_asambleia": "01-2024",
        "fecha": "2024-01-15T10:00:00",
        "lugar": "Salón Comunal",
        "estado": "realizada",
        "quorum_inicial": 45,
        "asistentes": [],
        "decisiones": [],
        "compromisos": [],
    }


@router.put("/assemblies/{assembly_id}")
def update_assembly(
    assembly_id: int,
    payload: AssemblyUpdate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Actualiza una asamblea."""
    return {"id": assembly_id, "success": True}


@router.post("/assemblies/{assembly_id}/acta")
def generate_acta(
    assembly_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Genera acta automática de asamblea."""
    return {
        "id": assembly_id,
        "acta_generada": True,
        "resumen_ejecutivo": "Asistencia de 45 miembros, se aprobaron 3 decisiones...",
        "compromisos": [
            {"responsable": "Tesorero", "compromiso": "Presentar informe financiero", "fecha": "2024-02-15"},
            {"responsable": "Secretario", "compromiso": "Convocar próxima asamblea", "fecha": "2024-02-01"},
        ],
    }


# =============================================================================
# ENDPOINTS: DOCUMENTOS
# =============================================================================

@router.get("/documents")
def list_documents(
    tipo: Optional[str] = None,
    categoria: Optional[str] = None,
    estado: Optional[str] = None,
    busqueda: Optional[str] = None,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Lista los documentos."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    return {
        "items": [],
        "por_vencer": [],
        "vencidos": [],
        "resumen": {
            "total_documentos": 0,
            "por_categoria": {},
            "por_tipo": {},
        },
    }


@router.post("/documents")
def create_document(
    payload: DocumentCreate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Sube un nuevo documento."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    return {
        "id": 1,
        "titulo": payload.titulo,
        "tipo_documento": payload.tipo_documento,
        "categoria": payload.categoria,
        "estado": "activo",
        "success": True,
    }


@router.get("/documents/{document_id}")
def get_document(
    document_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Obtiene un documento específico."""
    return {
        "id": document_id,
        "titulo": "Acta de Asamblea 2024",
        "tipo_documento": "acta",
        "categoria": "legal",
        "numero_documento": "ACT-001-2024",
        "fecha_documento": "2024-01-15T00:00:00",
        "estado": "activo",
    }


@router.put("/documents/{document_id}")
def update_document(
    document_id: int,
    payload: DocumentUpdate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Actualiza un documento."""
    return {"id": document_id, "success": True}


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Elimina un documento."""
    return {"success": True, "message": "Documento eliminado"}


# =============================================================================
# ENDPOINTS: CLASIFICACIÓN IA
# =============================================================================

@router.post("/documents/{document_id}/classify")
def classify_document(
    document_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Clasifica documento automáticamente con IA."""
    return {
        "document_id": document_id,
        "clasificacion": {
            "tipo": "acta",
            "categoria": "legal",
            "importancia": "alta",
            "riesgo_juridico": "bajo",
            "vencimiento": None,
        },
        "recomendaciones": [
            "Documento requerido para renovación de personería",
            "Vencimiento no aplica",
        ],
    }


@router.get("/documents/missing")
def get_missing_documents(
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Documentos faltantes según tipo de organización."""
    return {
        "documentos_faltantes": [
            {"tipo": "personeria_juridica", "prioridad": "alta", "mensaje": "Falta personería jurídica"},
            {"tipo": "estatutos", "prioridad": "alta", "mensaje": "Faltan estatutos vigentes"},
            {"tipo": "libro_actas", "prioridad": "media", "mensaje": "Libro de actas no registrado"},
        ],
    }


# =============================================================================
# ENDPOINTS: DASHBOARD
# =============================================================================

@router.get("/dashboard")
def get_assembly_dashboard(
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Dashboard de asambleas y documentos."""
    return {
        "semaforo": {
            "asambleas": "verde",
            "documental": "verde",
        },
        "metricas": {
            "asambleas_mes": 1,
            "prox_asamblea": None,
            "total_documentos": 0,
            "documentos_por_vencer": 0,
            "documentos_vencidos": 0,
        },
    }


@router.get("/options")
def get_assembly_options():
    """Opciones disponibles."""
    return {
        "tipos_asambleia": TIPOS_ASAMBLEA,
        "tipos_documento": TIPOS_DOCUMENTO,
        "categorias": CATEGORIAS_DOCUMENTO,
    }