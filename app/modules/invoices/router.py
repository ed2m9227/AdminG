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
from app.models.authorization import Authorization
from app.models.business_config import BusinessConfiguration
from app.models.user import User
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


def resolve_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def get_user_ids_for_data_sharing(user: User, db: Session):
    if user.parent_user_id:
        sibling_ids = [
            uid for (uid,) in db.query(User.id).filter(User.parent_user_id == user.parent_user_id).all()
        ]
        return list(dict.fromkeys([user.parent_user_id, user.id, *sibling_ids]))

    child_ids = [uid for (uid,) in db.query(User.id).filter(User.parent_user_id == user.id).all()]
    return [user.id, *child_ids]


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
    current_user: User = Depends(resolve_user)
):
    """
    Genera una factura con cálculo automático de IVA y retención
    """
    # Validar que el cliente existe
    user_id = current_user.id
    owner_id = current_user.parent_user_id if current_user.parent_user_id else current_user.id
    user_ids = get_user_ids_for_data_sharing(current_user, db)

    customer = db.query(Customer).filter(
        Customer.id == data.customer_id,
        Customer.user_id.in_(user_ids)
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    authorization = None
    if data.authorization_id:
        authorization = db.query(Authorization).filter(
            Authorization.id == data.authorization_id,
            Authorization.user_id == owner_id,
        ).first()
        if not authorization:
            raise HTTPException(status_code=404, detail="Authorization not found")
        if authorization.status != "approved":
            raise HTTPException(status_code=400, detail="Solo se puede facturar una autorización aprobada")
        if authorization.customer_id != data.customer_id:
            raise HTTPException(status_code=400, detail="La autorización no corresponde al cliente de la factura")
        if authorization.linked_invoice:
            raise HTTPException(status_code=400, detail="La autorización ya está vinculada a una factura")
    
    # Validar payment si se especificó
    if data.payment_id:
        payment = db.query(Payment).filter(
            Payment.id == data.payment_id,
            Payment.user_id.in_(user_ids)
        ).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
    
    if not data.items:
        raise HTTPException(status_code=400, detail="At least one invoice item is required")

    # Calcular subtotal de los items
    subtotal = Decimal(0)
    invoice_items_data = []

    for item_data in data.items:
        # Safely convert numeric values to Decimal
        qty = Decimal(str(item_data.quantity)) if item_data.quantity else Decimal('1')
        price = Decimal(str(item_data.unit_price)) if item_data.unit_price else Decimal('0')
        item_subtotal = to_money(qty * price)
        subtotal += item_subtotal
        
        # Safely convert IDs
        service_id_int = None
        if item_data.service_id:
            try:
                service_id_int = int(item_data.service_id) if isinstance(item_data.service_id, str) else item_data.service_id
            except (ValueError, TypeError):
                service_id_int = None
        
        inventory_id_int = None
        if item_data.inventory_item_id:
            try:
                inventory_id_int = int(item_data.inventory_item_id) if isinstance(item_data.inventory_item_id, str) else item_data.inventory_item_id
            except (ValueError, TypeError):
                inventory_id_int = None
        
        invoice_items_data.append({
            "description": item_data.description,
            "quantity": qty,
            "unit_price": price,
            "subtotal": item_subtotal,
            "inventory_item_id": inventory_id_int,
            "service_id": service_id_int
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
        authorization_id=data.authorization_id,
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
    current_user: User = Depends(resolve_user)
):
    """Obtiene una factura por ID."""
    user_ids = get_user_ids_for_data_sharing(current_user, db)
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id.in_(user_ids)
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
    current_user: User = Depends(resolve_user)
):
    """Lista todas las facturas del usuario actual."""
    user_ids = get_user_ids_for_data_sharing(current_user, db)
    query = db.query(Invoice).filter(Invoice.user_id.in_(user_ids))
    
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
    current_user: User = Depends(resolve_user)
):
    """Descarga la factura como PDF."""
    user_ids = get_user_ids_for_data_sharing(current_user, db)
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id.in_(user_ids)
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
    business_config = db.query(BusinessConfiguration).filter(BusinessConfiguration.user_id == invoice.user_id).first()
    billing_profile = (business_config.custom_fields or {}).get("billing_profile", {}) if business_config else {}

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

    issuer_name = billing_profile.get("legal_name") or (business_config.business_name if business_config else None) or "Negocio"
    issuer_doc_type = billing_profile.get("document_type") or "NIT"
    issuer_doc_number = billing_profile.get("document_number")
    issuer_regime = billing_profile.get("tax_regime")
    issuer_city = billing_profile.get("city")
    issuer_address = billing_profile.get("address")
    issuer_email = billing_profile.get("email")
    issuer_resolution = billing_profile.get("resolution")

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(50, y, issuer_name[:70])
    y -= 16

    pdf.setFont("Helvetica", 10)
    if issuer_doc_number:
        pdf.drawString(50, y, f"{issuer_doc_type}: {issuer_doc_number}")
        y -= 16
    if issuer_regime:
        pdf.drawString(50, y, f"Régimen: {issuer_regime}")
        y -= 16
    if issuer_address or issuer_city:
        pdf.drawString(50, y, f"Dirección: {(issuer_address or '').strip()} {(('- ' + issuer_city) if issuer_city else '')}".strip())
        y -= 16
    if issuer_email:
        pdf.drawString(50, y, f"Email: {issuer_email}")
        y -= 16
    if issuer_resolution:
        pdf.drawString(50, y, f"Referencia fiscal: {issuer_resolution}")
        y -= 20

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
