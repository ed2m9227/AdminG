"""
Cash Register Router
Gestión de caja registradora y transacciones de efectivo
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging
from app.db.session import get_db
from app.core.security import get_current_user_with_plan_check, get_current_user
from app.models.user import User
from app.models.cash_transaction import CashTransaction
from app.models.cash_register_session import CashRegisterSession
from app.models.customer import Customer
from app.models.inventory import InventoryItem
from pydantic import BaseModel
import json
from app.models.audit_log import AuditLog, VoidRequest
from fastapi import Request

router = APIRouter(
    prefix="/cashregister",
    tags=["Cash Register"]
)

logger = logging.getLogger(__name__)

class ItemSale(BaseModel):
    """Item vendido en caja con cantidad"""
    item_id: int
    quantity: int

class CashTransactionCreate(BaseModel):
    transaction_type: str  # 'sale', 'expense', 'base'
    amount: float
    customer_id: Optional[int] = None
    payment_id: Optional[int] = None  # NUEVO: Vincular a Payment si existe
    description: Optional[str] = None
    items: Optional[List[ItemSale]] = None  # Items descargados en venta

class CashTransactionOut(BaseModel):
    id: int
    transaction_type: str
    amount: float
    description: Optional[str]
    customer_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class CashTransactionOutFull(BaseModel):
    id: int
    transaction_type: str
    amount: float
    description: Optional[str]
    customer_id: Optional[int] = None
    created_at: datetime
    is_voided: bool = False
    void_reason: Optional[str] = None
    voided_by_user_id: Optional[int] = None
    voided_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class VoidTransactionRequest(BaseModel):
    reason: str

class ResolveVoidRequest(BaseModel):
    approve: bool
    note: Optional[str] = None

class OpenCashRegister(BaseModel):
    initial_amount: float


def get_cash_owner_id(user: User) -> int:
    """Sub-users operate over the parent cash register session."""
    return user.parent_user_id if user.parent_user_id else user.id


def get_shared_user_ids(user: User, db: Session) -> list[int]:
    """Return owner scope ids so parent and children share cash history and stock visibility."""
    if user.parent_user_id:
        sibling_ids = [uid for (uid,) in db.query(User.id).filter(User.parent_user_id == user.parent_user_id).all()]
        return list(dict.fromkeys([user.parent_user_id, user.id, *sibling_ids]))

    child_ids = [uid for (uid,) in db.query(User.id).filter(User.parent_user_id == user.id).all()]
    return [user.id, *child_ids]

@router.get("/")
async def get_cash_register_status(
    current_user: User = Depends(get_current_user_with_plan_check),
    db: Session = Depends(get_db)
):
    """Obtener estado actual de la caja registradora"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    owner_user_id = get_cash_owner_id(user)
    user_ids = get_shared_user_ids(user, db)

    # Check active session for owner (parent for sub-users)
    session = db.query(CashRegisterSession).filter(
        CashRegisterSession.user_id == owner_user_id,
        CashRegisterSession.is_active == True
    ).first()
    
    if not session:
        return {"status": "closed"}
    
    # Calcular totales desde apertura
    transactions = db.query(CashTransaction).filter(
        CashTransaction.user_id.in_(user_ids),
        CashTransaction.created_at >= session.opened_at
    ).all()
    
    sales_total = sum(float(t.amount) for t in transactions if t.transaction_type == 'sale')
    expenses_total = sum(float(t.amount) for t in transactions if t.transaction_type == 'expense')
    base_total = sum(float(t.amount) for t in transactions if t.transaction_type == 'base')
    
    return {
        "status": "open",
        "balance": session.initial_amount + sales_total - expenses_total,
        "sales": sales_total,
        "expenses": expenses_total,
        "base": base_total,
        "initial_amount": session.initial_amount,
        "opened_at": session.opened_at.isoformat(),
        "transaction_count": len(transactions)
    }

@router.post("/transactions", response_model=CashTransactionOut)
async def create_transaction(
    transaction: CashTransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear una transacción de caja (venta, gasto, base)
    
    Para ventas: descuenta automáticamente stock de los items incluidos
    """
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    owner_user_id = get_cash_owner_id(user)
    user_ids = get_shared_user_ids(user, db)

    # Check if session is open
    session = db.query(CashRegisterSession).filter(
        CashRegisterSession.user_id == owner_user_id,
        CashRegisterSession.is_active == True
    ).first()
    if not session:
        raise HTTPException(status_code=400, detail="Caja no está abierta")
    
    # Validar que el tipo de transacción sea válido
    if transaction.transaction_type not in ['sale', 'expense', 'base']:
        raise HTTPException(status_code=400, detail="Tipo de transacción inválido")
    
    # Descontar stock si es venta y hay items
    if transaction.transaction_type == 'sale' and transaction.items:
        for item_sale in transaction.items:
            item = db.query(InventoryItem).filter(
                InventoryItem.id == item_sale.item_id,
                InventoryItem.user_id.in_(user_ids)
            ).first()
            
            if not item:
                raise HTTPException(status_code=404, detail=f"Item {item_sale.item_id} no encontrado")
            
            if item.quantity < item_sale.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Stock insuficiente de {item.name}. Disponible: {item.quantity}, Solicitado: {item_sale.quantity}"
                )
            
            # Descontar cantidad
            item.quantity -= item_sale.quantity
            db.add(item)
    
    # Crear transacción
    db_transaction = CashTransaction(
        user_id=owner_user_id,
        customer_id=transaction.customer_id,
        payment_id=transaction.payment_id,  # NUEVO: Conectar a Payment
        transaction_type=transaction.transaction_type,
        amount=transaction.amount,
        description=transaction.description
    )
    
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    return db_transaction


@router.get("/transactions", response_model=List[CashTransactionOutFull])
async def get_transactions_full(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar transacciones con estado de anulación (reemplaza el GET anterior)."""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    user_ids = get_shared_user_ids(user, db)

    transactions = db.query(CashTransaction).filter(
        CashTransaction.user_id.in_(user_ids)
    ).order_by(CashTransaction.created_at.desc()).limit(limit).all()

    return transactions

@router.post("/open")
async def open_cash_register(
    data: OpenCashRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Abrir caja registradora con monto inicial"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()

    # Sub-users operate with parent's cash and cannot open independently
    if user.parent_user_id:
        raise HTTPException(status_code=403, detail="Solo el usuario padre puede abrir caja")
    
    # Check if already open
    existing = db.query(CashRegisterSession).filter(
        CashRegisterSession.user_id == user.id,
        CashRegisterSession.is_active == True
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Caja ya está abierta")
    
    # Create session
    session = CashRegisterSession(
        user_id=user.id,
        initial_amount=data.initial_amount
    )
    db.add(session)
    db.flush()
    
    # Create base transaction to sync with frontend
    base_transaction = CashTransaction(
        user_id=user.id,
        transaction_type='base',
        amount=data.initial_amount,
        description=f'Base inicial de caja'
    )
    db.add(base_transaction)
    db.commit()
    db.refresh(session)
    
    return {
        "success": True,
        "message": "Caja abierta",
        "initial_amount": data.initial_amount,
        "opened_at": session.opened_at.isoformat(),
        "status": "open"
    }

@router.post("/close")
async def close_cash_register(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cerrar caja registradora y generar reporte"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    user_ids = get_shared_user_ids(user, db)

    # Sub-users operate with parent's cash and cannot close independently
    if user.parent_user_id:
        raise HTTPException(status_code=403, detail="Solo el usuario padre puede cerrar caja")
    
    # Get active session
    session = db.query(CashRegisterSession).filter(
        CashRegisterSession.user_id == user.id,
        CashRegisterSession.is_active == True
    ).first()

    logger.info(
        "close_cash_register attempt user_id=%s parent_user_id=%s has_active_session=%s",
        user.id,
        user.parent_user_id,
        bool(session),
    )

    if not session:
        raise HTTPException(status_code=400, detail="No hay caja abierta")
    
    # Calcular totales desde apertura
    transactions = db.query(CashTransaction).filter(
        CashTransaction.user_id.in_(user_ids),
        CashTransaction.created_at >= session.opened_at
    ).all()
    
    sales = sum(float(t.amount) for t in transactions if t.transaction_type == 'sale')
    expenses = sum(float(t.amount) for t in transactions if t.transaction_type == 'expense')
    base = sum(float(t.amount) for t in transactions if t.transaction_type == 'base')
    final_balance = float(session.initial_amount) + sales - expenses
    
    # Close session
    session.is_active = False
    session.closed_at = datetime.utcnow()
    session.final_amount = final_balance
    db.add(session)
    db.flush()
    
    # Create close transaction to sync with frontend
    close_transaction = CashTransaction(
        user_id=user.id,
        transaction_type='close',
        amount=final_balance,
        description=f'Cierre de caja - Balance final: {final_balance}'
    )
    db.add(close_transaction)
    db.commit()
    
    return {
        "success": True,
        "message": "Caja cerrada",
        "final_balance": final_balance,
        "sales": sales,
        "expenses": expenses,
        "initial_amount": session.initial_amount,
        "base": base,
        "transaction_count": len(transactions),
        "status": "closed"
    }

@router.post("/reset")
async def reset_cash_register(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reset cash register state - cierra todas las sesiones pendientes (admin only)"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()

    # Keep ownership consistent: only parent account can reset shared cash state.
    if user.parent_user_id:
        raise HTTPException(status_code=403, detail="Solo el usuario padre puede resetear caja")
    
    user_ids = get_shared_user_ids(user, db)

    # Cierra todas las sesiones activas del usuario
    sessions = db.query(CashRegisterSession).filter(
        CashRegisterSession.user_id == user.id,
        CashRegisterSession.is_active == True
    ).all()
    
    count = 0
    for session in sessions:
        transactions = db.query(CashTransaction).filter(
            CashTransaction.user_id.in_(user_ids),
            CashTransaction.created_at >= session.opened_at
        ).all()

        sales = sum(float(t.amount) for t in transactions if t.transaction_type == 'sale')
        expenses = sum(float(t.amount) for t in transactions if t.transaction_type == 'expense')
        final_balance = float(session.initial_amount) + sales - expenses

        session.is_active = False
        session.closed_at = datetime.utcnow()
        session.final_amount = final_balance
        db.add(session)

        close_transaction = CashTransaction(
            user_id=user.id,
            transaction_type='close',
            amount=final_balance,
            description=f'Cierre por reset - Balance final: {final_balance}'
        )
        db.add(close_transaction)
        count += 1
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Se cerraron {count} sesión(es) pendiente(s)",
        "sessions_closed": count,
        "status": "reset"
    }


@router.post("/close-previous-day")
async def close_previous_day_cash(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Close the cash register session from a previous day.
    Used when user logs in and finds an open session from another day.
    """
    user = db.query(User).filter(User.id == int(current_user["id"])).first()

    # Keep ownership consistent: only parent account can close previous day session.
    if user.parent_user_id:
        raise HTTPException(status_code=403, detail="Solo el usuario padre puede cerrar caja del día anterior")
    
    # Get active session
    session = db.query(CashRegisterSession).filter(
        CashRegisterSession.user_id == user.id,
        CashRegisterSession.is_active == True
    ).first()
    if not session:
        raise HTTPException(status_code=400, detail="No hay caja abierta para cerrar")
    
    # Calculate totals from session start
    transactions = db.query(CashTransaction).filter(
        CashTransaction.user_id == user.id,
        CashTransaction.created_at >= session.opened_at
    ).all()
    
    sales = sum(float(t.amount) for t in transactions if t.transaction_type == 'sale')
    expenses = sum(float(t.amount) for t in transactions if t.transaction_type == 'expense')
    base = sum(float(t.amount) for t in transactions if t.transaction_type == 'base')
    final_balance = float(session.initial_amount) + sales - expenses
    
    # Close the previous day's session
    session.is_active = False
    session.closed_at = datetime.utcnow()
    session.final_amount = final_balance
    db.add(session)
    db.flush()
    
    # Create close transaction
    close_transaction = CashTransaction(
        user_id=user.id,
        customer_id=None,
        transaction_type='close',
        amount=final_balance,
        description=f'Cierre automático de caja anterior - Balance: {final_balance}'
    )
    db.add(close_transaction)
    db.commit()
    
    return {
        "success": True,
        "message": "Caja de día anterior cerrada",
        "final_balance": final_balance,
        "sales": sales,
        "expenses": expenses,
        "base": base,
        "initial_amount": session.initial_amount,
        "transaction_count": len(transactions),
        "status": "closed"
    }


 # ─── Void / Anulación de Movimientos ────────────────────────────────────────

@router.post("/transactions/{transaction_id}/void")
async def void_transaction(
    transaction_id: int,
    body: VoidTransactionRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Anular un movimiento de caja (solo usuario padre/owner).
    Registra en audit_log para trazabilidad completa.
    """
    user = db.query(User).filter(User.id == int(current_user["id"])).first()

    if user.parent_user_id:
        raise HTTPException(
            status_code=403,
            detail="Solo el administrador puede anular movimientos directamente. Use /request-void para solicitar anulación."
        )

    user_ids = get_shared_user_ids(user, db)

    tx = db.query(CashTransaction).filter(
        CashTransaction.id == transaction_id,
        CashTransaction.user_id.in_(user_ids)
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    if tx.is_voided:
        raise HTTPException(status_code=400, detail="Este movimiento ya fue anulado anteriormente")
    if tx.transaction_type in ('base', 'close'):
        raise HTTPException(status_code=400, detail="No se pueden anular movimientos de tipo base o cierre de caja")

    old_data = {
        "amount": float(tx.amount),
        "transaction_type": tx.transaction_type,
        "description": tx.description,
        "created_at": tx.created_at.isoformat()
    }

    tx.is_voided = True
    tx.void_reason = body.reason.strip()
    tx.voided_by_user_id = user.id
    tx.voided_at = datetime.utcnow()
    db.add(tx)

    ip = request.client.host if request.client else None
    audit = AuditLog(
        user_id=user.id,
        action="void_transaction",
        entity_type="cash_transaction",
        entity_id=transaction_id,
        detail=json.dumps({"reason": body.reason, "old_data": old_data}, ensure_ascii=False),
        ip_address=ip
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": "Movimiento anulado correctamente", "transaction_id": transaction_id}


@router.post("/transactions/{transaction_id}/request-void")
async def request_void_transaction(
    transaction_id: int,
    body: VoidTransactionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Usuario hijo solicita anulación de un movimiento al administrador.
    """
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    user_ids = get_shared_user_ids(user, db)

    tx = db.query(CashTransaction).filter(
        CashTransaction.id == transaction_id,
        CashTransaction.user_id.in_(user_ids)
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    if tx.is_voided:
        raise HTTPException(status_code=400, detail="Este movimiento ya fue anulado")
    if tx.transaction_type in ('base', 'close'):
        raise HTTPException(status_code=400, detail="No se pueden solicitar anulación de movimientos de base o cierre")

    # Evitar solicitudes duplicadas pendientes
    existing = db.query(VoidRequest).filter(
        VoidRequest.transaction_id == transaction_id,
        VoidRequest.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una solicitud de anulación pendiente para este movimiento")

    void_req = VoidRequest(
        transaction_id=transaction_id,
        requested_by=user.id,
        reason=body.reason.strip()
    )
    db.add(void_req)
    db.commit()
    db.refresh(void_req)

    return {
        "success": True,
        "message": "Solicitud de anulación enviada al administrador",
        "void_request_id": void_req.id
    }


@router.get("/void-requests")
async def get_void_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar solicitudes de anulación pendientes/historial (solo owner/padre)."""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if user.parent_user_id:
        raise HTTPException(status_code=403, detail="Solo el administrador puede ver solicitudes de anulación")

    user_ids = get_shared_user_ids(user, db)

    requests = (
        db.query(VoidRequest)
        .join(CashTransaction, VoidRequest.transaction_id == CashTransaction.id)
        .filter(CashTransaction.user_id.in_(user_ids))
        .order_by(VoidRequest.created_at.desc())
        .limit(100)
        .all()
    )

    result = []
    for vr in requests:
        tx = vr.transaction
        requester_name = vr.requester.email if vr.requester else "desconocido"
        result.append({
            "id": vr.id,
            "transaction_id": vr.transaction_id,
            "transaction_type": tx.transaction_type if tx else None,
            "transaction_amount": float(tx.amount) if tx else None,
            "transaction_description": tx.description if tx else None,
            "transaction_date": tx.created_at.isoformat() if tx else None,
            "requested_by_email": requester_name,
            "reason": vr.reason,
            "status": vr.status,
            "created_at": vr.created_at.isoformat(),
            "resolved_at": vr.resolved_at.isoformat() if vr.resolved_at else None
        })

    return result


@router.post("/void-requests/{void_request_id}/resolve")
async def resolve_void_request(
    void_request_id: int,
    body: ResolveVoidRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Owner aprueba o deniega una solicitud de anulación de movimiento."""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if user.parent_user_id:
        raise HTTPException(status_code=403, detail="Solo el administrador puede resolver solicitudes de anulación")

    void_req = db.query(VoidRequest).filter(VoidRequest.id == void_request_id).first()
    if not void_req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if void_req.status != "pending":
        raise HTTPException(status_code=400, detail="Esta solicitud ya fue resuelta")

    # Verify ownership
    user_ids = get_shared_user_ids(user, db)
    tx = db.query(CashTransaction).filter(
        CashTransaction.id == void_req.transaction_id,
        CashTransaction.user_id.in_(user_ids)
    ).first()
    if not tx:
        raise HTTPException(status_code=403, detail="Sin acceso a este movimiento")

    void_req.status = "approved" if body.approve else "denied"
    void_req.resolved_by = user.id
    void_req.resolved_at = datetime.utcnow()
    db.add(void_req)

    ip = request.client.host if request.client else None

    if body.approve:
        old_data = {
            "amount": float(tx.amount),
            "transaction_type": tx.transaction_type,
            "description": tx.description
        }
        tx.is_voided = True
        tx.void_reason = f"Aprobado por admin. Motivo solicitado: {void_req.reason}" + (f" | Nota admin: {body.note}" if body.note else "")
        tx.voided_by_user_id = user.id
        tx.voided_at = datetime.utcnow()
        db.add(tx)

        audit = AuditLog(
            user_id=user.id,
            action="approve_void",
            entity_type="void_request",
            entity_id=void_request_id,
            detail=json.dumps({"reason": void_req.reason, "note": body.note, "old_data": old_data}, ensure_ascii=False),
            ip_address=ip
        )
    else:
        audit = AuditLog(
            user_id=user.id,
            action="deny_void",
            entity_type="void_request",
            entity_id=void_request_id,
            detail=json.dumps({"reason": void_req.reason, "note": body.note}, ensure_ascii=False),
            ip_address=ip
        )
    db.add(audit)
    db.commit()

    action_label = "aprobada y movimiento anulado" if body.approve else "denegada"
    return {"success": True, "message": f"Solicitud {action_label}", "void_request_id": void_request_id}


