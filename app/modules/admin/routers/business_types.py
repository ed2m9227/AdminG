"""
Business Types Admin Router
Endpoints for managing business types (admin only)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from app.db.database import get_db
from app.models.business_type import BusinessType
from app.modules.admin.schemas.business_type import (
    BusinessTypeCreate,
    BusinessTypeUpdate,
    BusinessTypeOut,
)
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/admin/business-types", tags=["admin_business_types"])


def check_admin_access(current_user: User = Depends(get_current_user)):
    """Verify that user has admin privileges"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access this resource"
        )
    return current_user


@router.get("/", response_model=List[BusinessTypeOut])
async def list_business_types(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_access)
):
    """
    List all business types.
    Admin only endpoint.
    """
    query = db.query(BusinessType)
    
    if active_only:
        query = query.filter(BusinessType.is_active == True)
    
    query = query.order_by(BusinessType.order, BusinessType.label)
    business_types = query.offset(skip).limit(limit).all()
    
    return business_types


@router.get("/{business_type_id}", response_model=BusinessTypeOut)
async def get_business_type(
    business_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_access)
):
    """Get a specific business type by ID"""
    business_type = db.query(BusinessType).filter(
        BusinessType.id == business_type_id
    ).first()
    
    if not business_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business type not found"
        )
    
    return business_type


@router.post("/", response_model=BusinessTypeOut, status_code=status.HTTP_201_CREATED)
async def create_business_type(
    business_type: BusinessTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_access)
):
    """
    Create a new business type.
    Admin only endpoint.
    Code must be unique.
    """
    # Check if code already exists
    existing = db.query(BusinessType).filter(
        BusinessType.code == business_type.code
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Business type with code '{business_type.code}' already exists"
        )
    
    db_business_type = BusinessType(**business_type.dict())
    
    try:
        db.add(db_business_type)
        db.commit()
        db.refresh(db_business_type)
        return db_business_type
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Business type code must be unique"
        )


@router.put("/{business_type_id}", response_model=BusinessTypeOut)
async def update_business_type(
    business_type_id: int,
    business_type_update: BusinessTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_access)
):
    """
    Update a business type.
    Admin only endpoint.
    """
    db_business_type = db.query(BusinessType).filter(
        BusinessType.id == business_type_id
    ).first()
    
    if not db_business_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business type not found"
        )
    
    update_data = business_type_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_business_type, field, value)
    
    try:
        db.commit()
        db.refresh(db_business_type)
        return db_business_type
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not update business type"
        )


@router.delete("/{business_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_business_type(
    business_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_access)
):
    """
    Delete a business type (soft delete via is_active flag).
    Admin only endpoint.
    """
    db_business_type = db.query(BusinessType).filter(
        BusinessType.id == business_type_id
    ).first()
    
    if not db_business_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business type not found"
        )
    
    # Soft delete
    db_business_type.is_active = False
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete business type"
        )


@router.get("/public/list", response_model=List[BusinessTypeOut])
async def get_public_business_types(db: Session = Depends(get_db)):
    """
    Get list of active business types for public use (onboarding).
    No authentication required.
    """
    business_types = db.query(BusinessType).filter(
        BusinessType.is_active == True
    ).order_by(BusinessType.order, BusinessType.label).all()
    
    return business_types
