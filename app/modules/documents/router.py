from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.collaboration import get_scope_user_ids, resolve_collaboration_owner_id
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.customer import Customer
from app.models.document import Document
from app.models.user import User

router = APIRouter(prefix="/documents", tags=["Documents"])


class DocumentCreate(BaseModel):
    customer_id: int
    document_type: str
    title: str
    content: Optional[str] = None
    status: str = "draft"


class DocumentUpdate(BaseModel):
    document_type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None


def get_owner_and_scope(user: User, db: Session):
    # PRO/MAX collaboration for external partner owners in audit modules.
    owner_id = resolve_collaboration_owner_id(
        user,
        db,
        allow_external=True,
        allowed_owner_plans={"pro", "max", "admin"},
    )
    return owner_id, get_scope_user_ids(owner_id, db)


def serialize_document(document: Document):
    return {
        "id": document.id,
        "user_id": document.user_id,
        "customer_id": document.customer_id,
        "customer_name": document.customer.full_name if document.customer else None,
        "document_type": document.document_type,
        "title": document.title,
        "content": document.content,
        "status": document.status,
        "issued_at": document.issued_at.isoformat() if document.issued_at else None,
        "created_at": document.created_at.isoformat() if document.created_at else None,
        "updated_at": document.updated_at.isoformat() if document.updated_at else None,
        "created_by_user_id": document.created_by_user_id,
        "created_by_name": (document.created_by.full_name or document.created_by.email) if document.created_by else None,
    }


@router.get("/")
def list_documents(
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    owner_id, scope_user_ids = get_owner_and_scope(user, db)
    documents = (
        db.query(Document)
        .filter(Document.user_id == owner_id, Document.customer_id.in_(db.query(Customer.id).filter(Customer.user_id.in_(scope_user_ids))))
        .order_by(Document.created_at.desc())
        .limit(limit)
        .all()
    )
    return [serialize_document(document) for document in documents]


@router.post("/")
def create_document(
    payload: DocumentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    owner_id, scope_user_ids = get_owner_and_scope(user, db)
    customer = db.query(Customer).filter(Customer.id == payload.customer_id, Customer.user_id.in_(scope_user_ids)).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    status = (payload.status or "draft").strip().lower()
    issued_at = datetime.utcnow() if status == "issued" else None
    document = Document(
        user_id=owner_id,
        customer_id=payload.customer_id,
        created_by_user_id=user.id,
        document_type=payload.document_type.strip().lower(),
        title=payload.title.strip(),
        content=(payload.content or "").strip() or None,
        status=status,
        issued_at=issued_at,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return serialize_document(document)


@router.put("/{document_id}")
def update_document(
    document_id: int,
    payload: DocumentUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    owner_id, _ = get_owner_and_scope(user, db)
    document = db.query(Document).filter(Document.id == document_id, Document.user_id == owner_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    if payload.document_type is not None:
        document.document_type = payload.document_type.strip().lower()
    if payload.title is not None:
        document.title = payload.title.strip()
    if payload.content is not None:
        document.content = payload.content.strip() or None
    if payload.status is not None:
        document.status = payload.status.strip().lower()
        document.issued_at = datetime.utcnow() if document.status == "issued" else None

    db.add(document)
    db.commit()
    db.refresh(document)
    return serialize_document(document)
