"""
Cash Register Router
Gestión de caja registradora y transacciones de efectivo
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/cashregister",
    tags=["Cash Register"]
)

@router.get("/")
async def get_cash_register_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener estado actual de la caja registradora"""
    return {
        "status": "open",
        "balance": 0.0,
        "opened_at": None,
        "message": "Módulo de caja registradora - Próximamente disponible"
    }

@router.post("/open")
async def open_cash_register(
    initial_amount: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Abrir caja registradora con monto inicial"""
    return {
        "success": True,
        "message": "Caja abierta",
        "initial_amount": initial_amount
    }

@router.post("/close")
async def close_cash_register(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cerrar caja registradora y generar reporte"""
    return {
        "success": True,
        "message": "Caja cerrada",
        "final_balance": 0.0
    }

@router.get("/transactions")
async def get_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar transacciones de caja"""
    return []
