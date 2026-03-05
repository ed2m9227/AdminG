from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal
from datetime import datetime
from io import BytesIO

from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceItem
from app.models.tax_config import TaxConfig
from app.models.customer import Customer
from app.models.payment import Payment
from app.core.security import get_current_user
from app.modules.invoices.schemas import (
    InvoiceCreate, InvoiceResponse, 
    TaxConfigCreate, TaxConfigResponse
)

router = APIRouter(tags=["Invoices"])


MONEY_SCALE = Decimal("0.01")


def to_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_SCALE)


def require_admin(current_user: dict) -> None:
    if current_user.get("role") not in {"admin", "master_admin"}:
        raise HTTPException(status_code=403, detail="Admin role required")


def generate_invoice_number(db: Session) -> str:
    """Genera numero de factura secuencial."""
    last_invoice = db.query(Invoice).order_by(Invoice.id.desc()).first()
    if last_invoice and last_invoice.invoice_number:
        try:
            last_number = int(last_invoice.invoice_number.split("-")[-1])
            new_number = last_number + 1
        except (ValueError, IndexError):
            new_number = 1
    else:
        new_number = 1
    
    return f"INV-{datetime.now().year}-{new_number:05d}"


def get_active_tax_rate(db: Session, tax_type: str, applies_to: str = "all") -> Decimal:
    """Obtiene la tasa de impuesto activa."""
    tax_config = db.query(TaxConfig).filter(
        TaxConfig.tax_type == tax_type,
        TaxConfig.is_active.is_(True),
        TaxConfig.applies_to.in_([applies_to, "all"])
    ).first()
    
    return Decimal(tax_config.percentage) if tax_config else Decimal(0)


@router.post("/invoices/generate", response_model=InvoiceResponse)
def generate_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Genera una factura con cálculo automático de IVA y retención
    """
    # Validar que el cliente existe
    user_id = int(current_user["id"])

    customer = db.query(Customer).filter(
        Customer.id == data.customer_id,
        Customer.user_id == user_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Validar payment si se especificó
    if data.payment_id:
        payment = db.query(Payment).filter(
            Payment.id == data.payment_id,
            Payment.user_id == user_id
        ).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
    
    if not data.items:
        raise HTTPException(status_code=400, detail="At least one invoice item is required")

    # Calcular subtotal de los items
    subtotal = Decimal(0)
    invoice_items_data = []

    for item_data in data.items:
        item_subtotal = to_money(item_data.quantity * item_data.unit_price)
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
    
    iva_amount = to_money((subtotal * iva_percentage) / Decimal(100))
    
    # Determinar tasa de retención
    if data.apply_retencion:
        retencion_percentage = data.retencion_percentage if data.retencion_percentage is not None else get_active_tax_rate(db, "retencion")
    else:
        retencion_percentage = Decimal(0)
    
    retencion_amount = to_money((subtotal * retencion_percentage) / Decimal(100))

    # Calcular total
    subtotal = to_money(subtotal)
    total = to_money(subtotal + iva_amount - retencion_amount)
    
    # Crear factura
    invoice = Invoice(
        invoice_number=generate_invoice_number(db),
        user_id=user_id,
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
    
    print(f"Invoice generated: {invoice.invoice_number}")
    print(f"  Subtotal: ${subtotal}")
    print(f"  IVA ({iva_percentage}%): ${iva_amount}")
    print(f"  Retention ({retencion_percentage}%): ${retencion_amount}")
    print(f"  Total: ${total}")
    
    return invoice


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene una factura por ID."""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == int(current_user["id"])
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice


@router.get("/invoices", response_model=List[InvoiceResponse])
def list_invoices(
    skip: int = 0,
    limit: int = 100,
    customer_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Lista todas las facturas del usuario actual."""
    query = db.query(Invoice).filter(Invoice.user_id == int(current_user["id"]))
    
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    
    invoices = query.order_by(Invoice.issued_at.desc()).offset(skip).limit(limit).all()
    return invoices


@router.post("/tax-config", response_model=TaxConfigResponse)
def create_tax_config(
    data: TaxConfigCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Crea una configuracion de impuesto (IVA, retencion, etc.)."""
    require_admin(current_user)
    tax_config = TaxConfig(**data.model_dump())
    db.add(tax_config)
    db.commit()
    db.refresh(tax_config)
    
    print(f"Tax config created: {tax_config.name} ({tax_config.percentage}%)")
    return tax_config


@router.get("/tax-config", response_model=List[TaxConfigResponse])
def list_tax_configs(
    tax_type: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Lista configuraciones de impuestos."""
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
    current_user: dict = Depends(get_current_user)
):
    """Descarga la factura como PDF."""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == int(current_user["id"])
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
    except ImportError as exc:
        raise HTTPException(
            status_code=501,
            detail="PDF generation dependency missing: install reportlab"
        ) from exc

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 50

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(50, y, "Invoice")
    y -= 30

    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, y, f"Invoice Number: {invoice.invoice_number}")
    y -= 16
    pdf.drawString(50, y, f"Issued At: {invoice.issued_at.strftime('%Y-%m-%d %H:%M')}")
    y -= 16
    pdf.drawString(50, y, f"Customer: {customer.full_name if customer else invoice.customer_id}")
    y -= 24

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(50, y, "Description")
    pdf.drawString(320, y, "Qty")
    pdf.drawString(380, y, "Unit")
    pdf.drawString(470, y, "Subtotal")
    y -= 14
    pdf.line(50, y, 560, y)
    y -= 14

    pdf.setFont("Helvetica", 10)
    for item in invoice.items:
        if y < 110:
            pdf.showPage()
            y = height - 50
            pdf.setFont("Helvetica", 10)

        pdf.drawString(50, y, str(item.description)[:45])
        pdf.drawRightString(355, y, f"{item.quantity}")
        pdf.drawRightString(445, y, f"{item.unit_price:.2f}")
        pdf.drawRightString(555, y, f"{item.subtotal:.2f}")
        y -= 14

    y -= 14
    pdf.line(320, y, 560, y)
    y -= 16
    pdf.drawRightString(500, y, "Subtotal:")
    pdf.drawRightString(555, y, f"{invoice.subtotal:.2f}")
    y -= 14
    pdf.drawRightString(500, y, f"IVA ({invoice.iva_percentage}%):")
    pdf.drawRightString(555, y, f"{invoice.iva_amount:.2f}")
    y -= 14
    pdf.drawRightString(500, y, f"Retention ({invoice.retencion_percentage}%):")
    pdf.drawRightString(555, y, f"-{invoice.retencion_amount:.2f}")
    y -= 18
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawRightString(500, y, "Total:")
    pdf.drawRightString(555, y, f"{invoice.total:.2f}")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)

    filename = f"{invoice.invoice_number}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
