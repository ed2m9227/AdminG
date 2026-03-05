from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.models.invoice import Invoice, InvoiceItem
from app.models.tax_config import TaxConfig
from app.models.customer import Customer
from app.models.payment import Payment
from app.modules.auth.dependencies import get_current_user
from app.modules.invoices.schemas import (
    InvoiceCreate, InvoiceResponse, 
    TaxConfigCreate, TaxConfigResponse
)

router = APIRouter()


def generate_invoice_number(db: Session) -> str:
    """Genera número de factura secuencial"""
    last_invoice = db.query(Invoice).order_by(Invoice.id.desc()).first()
    if last_invoice and last_invoice.invoice_number:
        try:
            last_number = int(last_invoice.invoice_number.split("-")[-1])
            new_number = last_number + 1
        except:
            new_number = 1
    else:
        new_number = 1
    
    return f"INV-{datetime.now().year}-{new_number:05d}"


def get_active_tax_rate(db: Session, tax_type: str, applies_to: str = "all") -> Decimal:
    """Obtiene la tasa de impuesto activa"""
    tax_config = db.query(TaxConfig).filter(
        TaxConfig.tax_type == tax_type,
        TaxConfig.is_active == True,
        TaxConfig.applies_to.in_([applies_to, "all"])
    ).first()
    
    return Decimal(tax_config.percentage) if tax_config else Decimal(0)


@router.post("/invoices/generate", response_model=InvoiceResponse)
def generate_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Genera una factura con cálculo automático de IVA y retención
    """
    # Validar que el cliente existe
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Validar payment si se especificó
    if data.payment_id:
        payment = db.query(Payment).filter(Payment.id == data.payment_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    # Calcular subtotal de los items
    subtotal = Decimal(0)
    invoice_items_data = []
    
    for item_data in data.items:
        item_subtotal = item_data.quantity * item_data.unit_price
        subtotal += item_subtotal
        invoice_items_data.append({
            "description": item_data.description,
            "quantity": item_data.quantity,
            "unit_price": item_data.unit_price,
            "subtotal": item_subtotal,
            "inventory_item_id": item_data.inventory_item_id,
            "service_id": item_data.service_id
        })
    
    # Determinar tasa de IVA
    if data.apply_iva:
        iva_percentage = data.iva_percentage if data.iva_percentage is not None else get_active_tax_rate(db, "iva")
    else:
        iva_percentage = Decimal(0)
    
    iva_amount = (subtotal * iva_percentage) / Decimal(100)
    
    # Determinar tasa de retención
    if data.apply_retencion:
        retencion_percentage = data.retencion_percentage if data.retencion_percentage is not None else get_active_tax_rate(db, "retencion")
    else:
        retencion_percentage = Decimal(0)
    
    retencion_amount = (subtotal * retencion_percentage) / Decimal(100)
    
    # Calcular total
    total = subtotal + iva_amount - retencion_amount
    
    # Crear factura
    invoice = Invoice(
        invoice_number=generate_invoice_number(db),
        user_id=current_user.id,
        customer_id=data.customer_id,
        payment_id=data.payment_id,
        subtotal=subtotal,
        iva_percentage=iva_percentage,
        iva_amount=iva_amount,
        retencion_percentage=retencion_percentage,
        retencion_amount=retencion_amount,
        total=total,
        notes=data.notes,
        status="issued"
    )
    
    db.add(invoice)
    db.flush()  # Para obtener el invoice.id
    
    # Crear items de la factura
    for item_data in invoice_items_data:
        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            **item_data
        )
        db.add(invoice_item)
    
    db.commit()
    db.refresh(invoice)
    
    print(f"📄 Factura generada: {invoice.invoice_number}")
    print(f"   Subtotal: ${subtotal}")
    print(f"   IVA ({iva_percentage}%): ${iva_amount}")
    print(f"   Retención ({retencion_percentage}%): ${retencion_amount}")
    print(f"   Total: ${total}")
    
    return invoice


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene una factura por ID"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    return invoice


@router.get("/invoices", response_model=List[InvoiceResponse])
def list_invoices(
    skip: int = 0,
    limit: int = 100,
    customer_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todas las facturas"""
    query = db.query(Invoice)
    
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    
    invoices = query.order_by(Invoice.issued_at.desc()).offset(skip).limit(limit).all()
    return invoices


@router.post("/tax-config", response_model=TaxConfigResponse)
def create_tax_config(
    data: TaxConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea una configuración de impuesto (IVA, retención, etc.)"""
    tax_config = TaxConfig(**data.model_dump())
    db.add(tax_config)
    db.commit()
    db.refresh(tax_config)
    
    print(f"💰 Configuración de impuesto creada: {tax_config.name} ({tax_config.percentage}%)")
    return tax_config


@router.get("/tax-config", response_model=List[TaxConfigResponse])
def list_tax_configs(
    tax_type: str = None,
    is_active: bool = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todas las configuraciones de impuestos"""
    query = db.query(TaxConfig)
    
    if tax_type:
        query = query.filter(TaxConfig.tax_type == tax_type)
    if is_active is not None:
        query = query.filter(TaxConfig.is_active == is_active)
    
    configs = query.all()
    return configs


@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Descarga la factura como PDF
    TODO: Implementar generación de PDF
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    # TODO: Generar PDF con reportlab o weasyprint
    return {"message": "PDF generation not implemented yet", "invoice_id": invoice_id}
