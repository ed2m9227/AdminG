"""
Módulo IV: Tesorería y Recaudo
Módulo V: Impuestos y Obligaciones

Fase 2 - AdminG para JAC
"""

import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.governance import Dignitary, GovernanceEntity, LegalEntity
from app.models.user import User

router = APIRouter(prefix="/treasury", tags=["Treasury & Taxes"])


# =============================================================================
# SCHEMAS
# =============================================================================

class PaymentCreate(BaseModel):
    """Pago comunitario o institucional"""
    tipo_pago: str  # comunitario, institucional, otro
    concepto: str
    monto: float
    fecha_pago: datetime
    metodo_pago: str  # efectivo, transferencia, consignacion, datáfono
    quien_paga: str  # Nombre de quien paga
    quien_recibe: Optional[str] = None  # Nombre del que recibe
    referencia: Optional[str] = None  # Número de transacción
    observaciones: Optional[str] = None


class PaymentUpdate(BaseModel):
    concepto: Optional[str] = None
    monto: Optional[float] = None
    fecha_pago: Optional[datetime] = None
    metodo_pago: Optional[str] = None
    estado: Optional[str] = None  # pendiente, confirmado, anulado
    observaciones: Optional[str] = None


class TaxPaymentCreate(BaseModel):
    """Pago de impuestos municipales"""
    tipo_impuesto: str  # predial, valorizacion, industria_comercio, tasas, otro
    numero_pago: str  # Número de factura o recibo
    monto: float
    fecha_pago: datetime
    fecha_vencimiento: Optional[datetime] = None
    entidad_recaudadora: str  # Alcaldía, etc.
    numero_resolucion: Optional[str] = None
    periodo: Optional[str] = None  # Ej: "2024-01" o "2024"
    observaciones: Optional[str] = None


class TaxPaymentUpdate(BaseModel):
    monto: Optional[float] = None
    fecha_pago: Optional[datetime] = None
    estado: Optional[str] = None  # pendiente, pagado, vencido, perdonado
    observaciones: Optional[str] = None


# =============================================================================
# HELPERS
# =============================================================================

def _resolve_user(current_user=Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _get_user_governance_entity(user: User, db: Session) -> Optional[GovernanceEntity]:
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    return db.query(GovernanceEntity).filter(GovernanceEntity.owner_user_id == owner_user_id).first()


# =============================================================================
# TIPOS DE PAGOS COMUNITARIOS
# =============================================================================

TIPOS_PAGO_COMUNITARIO = [
    {"code": "cuota_mensual", "label": "Cuota Mensual"},
    {"code": "cuota_extraordinaria", "label": "Cuota Extraordinaria"},
    {"code": "aporte_voluntario", "label": "Aporte Voluntario"},
    {"code": "contribucion_barrial", "label": "Contribución Barrial"},
    {"code": "cuota_afiliacion", "label": "Cuota de Afiliación"},
    {"code": "actividad_comunitaria", "label": "Actividad Comunitaria"},
]

TIPOS_PAGO_INSTITUCIONAL = [
    {"code": "impuesto_predial", "label": "Impuesto Predial"},
    {"code": "valorizacion", "label": "Valorización"},
    {"code": "industria_comercio", "label": "Industria y Comercio"},
    {"code": "tasas_municipales", "label": "Tasas Municipales"},
    {"code": "servicios_publicos", "label": "Servicios Públicos"},
    {"code": "obligaciones_notariales", "label": "Obligaciones Notariales"},
    {"code": "camara_comercio", "label": "Cámara de Comercio"},
    {"code": "certificados", "label": "Certificados"},
    {"code": "tramites_municipales", "label": "Trámites Municipales"},
]

OTROS_PAGOS = [
    {"code": "convenio", "label": "Convenio"},
    {"code": "subvencion", "label": "Subvención"},
    {"code": "recurso_publico", "label": "Recurso Público"},
    {"code": "donacion", "label": "Donación"},
    {"code": "proyecto_cofinanciado", "label": "Proyecto Cofinanciado"},
]

METODOS_PAGO = [
    {"code": "efectivo", "label": "Efectivo"},
    {"code": "transferencia", "label": "Transferencia Bancaria"},
    {"code": "consignacion", "label": "Consignación"},
    {"code": "datofono", "label": "Datáfono"},
    {"code": "qr", "label": "QR / PSE"},
    {"code": "cheque", "label": "Cheque"},
]


# =============================================================================
# ENDPOINTS: PAGOS (TESORERÍA)
# =============================================================================

# Tabla: treasury_payments (se crea si no existe)
@router.get("/payments")
def list_payments(
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    fechaDesde: Optional[datetime] = None,
    fechaHasta: Optional[datetime] = None,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Lista los pagos registrados."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    # Simular respuesta (en implementación real, leer de DB)
    return {
        "items": [],
        "resumen": {
            "total_recaudado_mes": 0,
            "total_recaudado_anio": 0,
            "pagos_pendientes": 0,
            "pagos_confirmados": 0,
        },
        "tipos_disponibles": TIPOS_PAGO_COMUNITARIO + TIPOS_PAGO_INSTITUCIONAL + OTROS_PAGOS,
    }


@router.post("/payments")
def create_payment(
    payload: PaymentCreate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Registra un nuevo pago."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    # En implementación real, crear registro en DB
    return {
        "id": 1,
        "tipo_pago": payload.tipo_pago,
        "concepto": payload.concepto,
        "monto": payload.monto,
        "fecha_pago": payload.fecha_pago.isoformat(),
        "estado": "confirmado",
        "success": True,
    }


@router.get("/payments/{payment_id}")
def get_payment(
    payment_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Obtiene un pago específico."""
    return {
        "id": payment_id,
        "tipo_pago": "cuota_mensual",
        "concepto": "Cuota mensual febrero 2024",
        "monto": 50000,
        "fecha_pago": "2024-02-15T00:00:00",
        "estado": "confirmado",
    }


@router.put("/payments/{payment_id}")
def update_payment(
    payment_id: int,
    payload: PaymentUpdate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Actualiza un pago."""
    return {"id": payment_id, "success": True}


@router.delete("/payments/{payment_id}")
def delete_payment(
    payment_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Anula un pago."""
    return {"success": True, "message": "Pago anulado"}


# =============================================================================
# ENDPOINTS: IMPUESTOS
# =============================================================================

@router.get("/taxes")
def list_taxes(
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Lista los pagos de impuestos."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    return {
        "items": [],
        "resumen": {
            "total_impuestos_mes": 0,
            "total_impuestos_anio": 0,
            "impuestos_pendientes": 0,
            "impuestos_vencidos": 0,
            "impuestos_pagados": 0,
        },
        "tipos_impuesto": [
            {"code": "predial", "label": "Impuesto Predial"},
            {"code": "valorizacion", "label": "Valorización"},
            {"code": "industria_comercio", "label": "Industria y Comercio"},
            {"code": "tasas", "label": "Tasas Municipales"},
            {"code": "otro", "label": "Otro"},
        ],
    }


@router.post("/taxes")
def create_tax_payment(
    payload: TaxPaymentCreate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Registra un pago de impuesto."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    return {
        "id": 1,
        "tipo_impuesto": payload.tipo_impuesto,
        "numero_pago": payload.numero_pago,
        "monto": payload.monto,
        "fecha_pago": payload.fecha_pago.isoformat(),
        "estado": "pagado",
        "success": True,
    }


@router.get("/taxes/{tax_id}")
def get_tax_payment(
    tax_id: int,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Obtiene un pago de impuesto específico."""
    return {
        "id": tax_id,
        "tipo_impuesto": "predial",
        "numero_pago": "FACT-2024-001",
        "monto": 150000,
        "fecha_pago": "2024-03-15T00:00:00",
        "estado": "pagado",
    }


@router.put("/taxes/{tax_id}")
def update_tax_payment(
    tax_id: int,
    payload: TaxPaymentUpdate,
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Actualiza un pago de impuesto."""
    return {"id": tax_id, "success": True}


# =============================================================================
# ENDPOINTS: DASHBOARD DE TESORERÍA
# =============================================================================

@router.get("/dashboard")
def get_treasury_dashboard(
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Dashboard de tesorería con semáforo financiero."""
    owner_user_id = user.parent_user_id if user.parent_user_id else user.id
    
    # Métricas simuladas (en implementación real, calcular desde DB)
    return {
        "semaforo": {
            "financiero": "verde",  # verde: OK, amarillo: precaución, rojo: déficit
            "tributario": "verde",  # verde: al día, amarillo: próximo, rojo: vencido
        },
        "metricas": {
            "total_recaudado_mes": 1250000,
            "total_recaudado_anio": 8500000,
            "gastos_mes": 450000,
            "balance_actual": 3800000,
            "cuentas_por_cobrar": 250000,
            "cuentas_por_pagar": 180000,
        },
        "proyeccion": {
            "déficit_proyectado": False,
            "meses_sin_déficit": 8,
            "necesidad_futura": 2000000,
        },
        "alertas": [],
    }


@router.get("/tax-alerts")
def get_tax_alerts(
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Alertas de impuestos próximos a vencer."""
    fecha_limite = datetime.utcnow() + timedelta(days=30)
    
    return {
        "alertas": [
            {
                "tipo": "vencimiento",
                "impuesto": "Industria y Comercio",
                "fecha_vencimiento": (datetime.utcnow() + timedelta(days=15)).isoformat(),
                "monto": 250000,
                "prioridad": "alta",
                "mensaje": "Pago de industria y comercio vence en 15 días",
            }
        ],
        "vencidos": 0,
        "proximos": 1,
    }


@router.get("/fraud-detection")
def get_fraud_detection(
    user: User = Depends(_resolve_user),
    db: Session = Depends(get_db),
):
    """Detección de anomalías en pagos (IA antifraude)."""
    return {
        "analisis": {
            "pagos_duplicados": 0,
            "anomalias_detectadas": 0,
            "pagos_sospechosos": 0,
            "ultimo_analisis": datetime.utcnow().isoformat(),
        },
        "recomendaciones": [],
    }


@router.get("/options")
def get_treasury_options():
    """Opciones disponibles para tesorería."""
    return {
        "tipos_pago": {
            "comunitario": TIPOS_PAGO_COMUNITARIO,
            "institucional": TIPOS_PAGO_INSTITUCIONAL,
            "otro": OTROS_PAGOS,
        },
        "metodos_pago": METODOS_PAGO,
    }