"""
Admin Router
Panel de administración de usuarios y configuración del sistema
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

def require_admin(current_user: User = Depends(get_current_user)):
    """Middleware para verificar que el usuario sea admin"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access forbidden: Admin role required")
    return current_user

@router.get("/users")
async def list_all_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Listar todos los usuarios del sistema (solo admin)"""
    users = db.query(User).all()
    return [
        {
            "id": user.id,
            "email": user.email,
            "plan": user.plan,
            "role": user.role,
            "business_type": user.business_type,
            "is_active": True
        }
        for user in users
    ]

@router.get("/stats")
async def get_system_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Obtener estadísticas del sistema (solo admin)"""
    total_users = db.query(User).count()
    
    # Contar por plan
    from sqlalchemy import func
    plans_count = db.query(
        User.plan,
        func.count(User.id)
    ).group_by(User.plan).all()
    
    return {
        "total_users": total_users,
        "plans_distribution": {plan: count for plan, count in plans_count},
        "system_version": "1.0.0"
    }

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    new_role: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Cambiar el rol de un usuario (solo admin)"""
    if new_role not in ["viewer", "manager", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = new_role
    db.commit()
    
    return {"success": True, "message": f"Role updated to {new_role}"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Eliminar un usuario (solo admin)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(user)
    db.commit()
    
    return {"success": True, "message": "User deleted"}
