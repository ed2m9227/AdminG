"""
Admin Router - Master Admin Panel y Team Management
Endpoint para administradores globales y gestión de equipos
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.core.security import get_current_user, hash_password
from app.core.features import get_available_features, get_plan_limits, Feature
from app.models.user import User
from app.models.team_user import TeamUser
from datetime import datetime

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


def require_admin(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Middleware para verificar que el usuario sea admin global"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user or user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden acceder a este endpoint"
        )
    return user


def is_team_owner(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verifica que el usuario pueda gestionar su equipo"""
    from app.core.features import has_feature, Feature
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not has_feature(user.plan, Feature.MANAGE_TEAM_USERS, user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu plan no incluye gestión de equipos"
        )
    return user


# ============== MASTER ADMIN ENDPOINTS ==============

@router.get("/master/dashboard")
def master_dashboard(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Panel maestro del administrador - Solo para admins globales"""
    from sqlalchemy import func
    
    try:
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
        
        users_by_plan = {}
        for plan in ["free", "basic", "plus", "start", "max"]:
            count = db.query(func.count(User.id)).filter(User.plan == plan).scalar() or 0
            users_by_plan[plan] = count
        
        users_by_role = {}
        for role in ["viewer", "manager", "admin"]:
            count = db.query(func.count(User.id)).filter(User.role == role).scalar() or 0
            users_by_role[role] = count
        
        return {
            "status": "ok",
            "role": "master_admin",
            "statistics": {
                "total_users": total_users,
                "active_users": active_users,
                "by_plan": users_by_plan,
                "by_role": users_by_role,
            },
            "features_available": get_available_features("admin", "admin")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/master/users")
def list_all_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """Lista todos los usuarios del sistema (Master Admin only)"""
    try:
        users = db.query(User).offset(skip).limit(limit).all()
        total = db.query(User).count()
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "users": [
                {
                    "id": u.id,
                    "email": u.email,
                    "role": u.role,
                    "plan": u.plan,
                    "is_active": u.is_active,
                    "business_type": u.business_type,
                    "created_at": u.created_at.isoformat(),
                    "updated_at": u.updated_at.isoformat(),
                }
                for u in users
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/master/users/{user_id}/role")
def change_user_role(
    user_id: int,
    new_role: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Cambia el rol de un usuario (Master Admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        if new_role not in ["viewer", "manager", "admin"]:
            raise HTTPException(status_code=400, detail="Rol inválido")
        
        user.role = new_role
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        return {
            "success": True,
            "message": f"Rol actualizado a {new_role}",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/master/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Elimina un usuario del sistema (Master Admin only)"""
    try:
        if user_id == admin.id:
            raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        db.delete(user)
        db.commit()
        
        return {"success": True, "message": "Usuario eliminado"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============== TEAM MANAGEMENT ENDPOINTS ==============

@router.get("/team/members")
def get_team_members(
    user: User = Depends(is_team_owner),
    db: Session = Depends(get_db)
):
    """Obtiene los miembros del equipo del usuario"""
    try:
        team_members = db.query(TeamUser).filter(
            TeamUser.team_owner_id == user.id,
            TeamUser.is_active == True
        ).all()
        
        return {
            "team_owner": {
                "id": user.id,
                "email": user.email,
                "plan": user.plan,
                "role": user.role,
            },
            "plan_limits": get_plan_limits(user.plan),
            "members": [
                {
                    "id": m.member.id,
                    "email": m.member.email,
                    "role_in_team": m.role_in_team,
                    "status": m.status,
                    "joined_at": m.joined_at.isoformat() if m.joined_at else None,
                    "invited_at": m.invited_at.isoformat(),
                }
                for m in team_members
            ],
            "count": len(team_members),
            "max_team_size": get_plan_limits(user.plan)["team_members"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/team/invite")
def invite_team_member(
    email: str,
    role: str = "viewer",
    user: User = Depends(is_team_owner),
    db: Session = Depends(get_db)
):
    """Invita un usuario al equipo"""
    try:
        limits = get_plan_limits(user.plan)
        current_team_size = db.query(TeamUser).filter(
            TeamUser.team_owner_id == user.id
        ).count()
        
        if current_team_size >= limits["team_members"]:
            raise HTTPException(
                status_code=400,
                detail=f"Límite de equipo alcanzado ({limits['team_members']} miembros). Mejora tu plan."
            )
        
        member = db.query(User).filter(User.email == email).first()
        if not member:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        if member.id == user.id:
            raise HTTPException(status_code=400, detail="No puedes invitarte a ti mismo")
        
        existing = db.query(TeamUser).filter(
            TeamUser.team_owner_id == user.id,
            TeamUser.member_user_id == member.id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Este usuario ya está en tu equipo")
        
        team_user = TeamUser(
            team_owner_id=user.id,
            member_user_id=member.id,
            role_in_team=role,
            status="invited"
        )
        
        db.add(team_user)
        db.commit()
        db.refresh(team_user)
        
        return {
            "success": True,
            "message": f"Invitación enviada a {email}",
            "invitation": {
                "id": team_user.id,
                "email": member.email,
                "role": role,
                "status": "invited",
                "invited_at": team_user.invited_at.isoformat()
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/team/create")
def create_team_user(
    email: str,
    password: str,
    role: str = "viewer",
    user: User = Depends(is_team_owner),
    db: Session = Depends(get_db)
):
    """Crea un usuario nuevo dentro del equipo (limitado por plan)"""
    try:
        limits = get_plan_limits(user.plan)
        current_team_size = db.query(TeamUser).filter(
            TeamUser.team_owner_id == user.id
        ).count()

        if current_team_size >= limits["team_members"]:
            raise HTTPException(
                status_code=400,
                detail=f"Límite de equipo alcanzado ({limits['team_members']} miembros). Mejora tu plan."
            )

        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(status_code=400, detail="El email ya está registrado")

        if role not in ["viewer", "manager", "admin"]:
            raise HTTPException(status_code=400, detail="Rol inválido")

        new_user = User(
            email=email,
            hashed_password=hash_password(password),
            role=role,
            plan=user.plan,
            is_active=True,
            business_type=user.business_type,
            parent_user_id=user.id
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        team_user = TeamUser(
            team_owner_id=user.id,
            member_user_id=new_user.id,
            role_in_team=role,
            status="active",
            joined_at=datetime.utcnow()
        )
        db.add(team_user)
        db.commit()
        db.refresh(team_user)

        return {
            "success": True,
            "message": "Usuario de equipo creado",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "role": new_user.role,
                "plan": new_user.plan
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/team/accept-invite/{invitation_id}")
def accept_team_invite(
    invitation_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Acepta una invitación al equipo"""
    try:
        invite = db.query(TeamUser).filter(
            TeamUser.id == invitation_id,
            TeamUser.member_user_id == user.id
        ).first()
        
        if not invite:
            raise HTTPException(status_code=404, detail="Invitación no encontrada")
        
        invite.status = "active"
        invite.joined_at = datetime.utcnow()
        db.commit()
        db.refresh(invite)
        
        return {
            "success": True,
            "message": "Te has unido al equipo",
            "team_owner_email": invite.team_owner.email
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/team/members/{member_id}")
def remove_team_member(
    member_id: int,
    user: User = Depends(is_team_owner),
    db: Session = Depends(get_db)
):
    """Elimina un miembro del equipo"""
    try:
        team_user = db.query(TeamUser).filter(
            TeamUser.team_owner_id == user.id,
            TeamUser.member_user_id == member_id
        ).first()
        
        if not team_user:
            raise HTTPException(status_code=404, detail="Miembro del equipo no encontrado")
        
        db.delete(team_user)
        db.commit()
        
        return {"success": True, "message": "Miembro removido del equipo"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/features")
def get_user_features(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene las features disponibles para el usuario actual"""
    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {
        "plan": user.plan,
        "role": user.role,
        "features": get_available_features(user.plan, user.role),
        "limits": get_plan_limits(user.plan)
    }
