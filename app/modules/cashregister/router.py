"""
Cash Register Router
Gestión de caja registradora y transacciones de efectivo
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.cash_transaction import CashTransaction
from app.models.customer import Customer
from app.models.inventory import InventoryItem
from pydantic import BaseModel

router = APIRouter(
    prefix="/cashregister",
    tags=["Cash Register"]
)

class ItemSale(BaseModel):
    """Item vendido en caja con cantidad"""
    item_id: int
    quantity: int

class CashTransactionCreate(BaseModel):
    transaction_type: str  # 'sale', 'expense', 'base'
    amount: float
    customer_id: Optional[int] = None
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

class OpenCashRegister(BaseModel):
    initial_amount: float

@router.get("/")
async def get_cash_register_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener estado actual de la caja registradora"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    
    # Calcular totales de hoy
    today = datetime.utcnow().date()
    transactions = db.query(CashTransaction).filter(
        CashTransaction.user_id == user.id,
        CashTransaction.created_at >= datetime.combine(today, datetime.min.time())
    ).all()
    
    sales_total = sum(float(t.amount) for t in transactions if t.transaction_type == 'sale')
    expenses_total = sum(float(t.amount) for t in transactions if t.transaction_type == 'expense')
    base_total = sum(float(t.amount) for t in transactions if t.transaction_type == 'base')
    
    return {
        "status": "open",
        "balance": sales_total + base_total - expenses_total,
        "sales": sales_total,
        "expenses": expenses_total,
        "base": base_total,
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
    
    # Validar que el tipo de transacción sea válido
    if transaction.transaction_type not in ['sale', 'expense', 'base']:
        raise HTTPException(status_code=400, detail="Tipo de transacción inválido")
    
    # Descontar stock si es venta y hay items
    if transaction.transaction_type == 'sale' and transaction.items:
        for item_sale in transaction.items:
            item = db.query(InventoryItem).filter(
                InventoryItem.id == item_sale.item_id,
                InventoryItem.user_id == user.id
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
        user_id=user.id,
        customer_id=transaction.customer_id,
        transaction_type=transaction.transaction_type,
        amount=transaction.amount,
        description=transaction.description
    )
    
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    return db_transaction

@router.get("/transactions", response_model=List[CashTransactionOut])
async def get_transactions(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar transacciones de caja del usuario actual"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    
    transactions = db.query(CashTransaction).filter(
        CashTransaction.user_id == user.id
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
    
    # Crear movimiento de base
    db_transaction = CashTransaction(
        user_id=user.id,
        transaction_type='base',
        amount=data.initial_amount,
        description=f'Base inicial para apertura de caja'
    )
    db.add(db_transaction)
    db.commit()
    
    return {
        "success": True,
        "message": "Caja abierta",
        "initial_amount": data.initial_amount
    }

@router.post("/close")
async def close_cash_register(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cerrar caja registradora y generar reporte"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    
    # Calcular totales
    today = datetime.utcnow().date()
    transactions = db.query(CashTransaction).filter(
        CashTransaction.user_id == user.id,
        CashTransaction.created_at >= datetime.combine(today, datetime.min.time())
    ).all()
    
    sales = sum(float(t.amount) for t in transactions if t.transaction_type == 'sale')
    expenses = sum(float(t.amount) for t in transactions if t.transaction_type == 'expense')
    base = sum(float(t.amount) for t in transactions if t.transaction_type == 'base')
    final_balance = sales + base - expenses
    
    return {
        "success": True,
        "message": "Caja cerrada",
        "final_balance": final_balance,
        "sales": sales,
        "expenses": expenses,
        "base": base,
        "transaction_count": len(transactions)
    }
