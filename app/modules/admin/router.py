"""
Admin Router - Master Admin Panel y Team Management
Endpoint para administradores globales y gestión de equipos
"""

from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.collaboration import get_scope_user_ids, normalize_plan, resolve_collaboration_owner_id
from app.core.security import get_current_user, hash_password
from app.core.email_service import send_role_changed_alert
from app.core.features import get_available_features, get_plan_limits, has_feature, Feature
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.models.team_user import TeamUser
from app.models.customer import Customer
from app.models.appointment import Appointment
from app.models.payment import Payment
from app.models.pet import Pet
from app.models.inventory import InventoryCategory, InventoryItem, InventoryMovement
from app.models.business_config import BusinessConfiguration
from app.models.service import Service
from app.models.notification import Notification
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment_item import PaymentItem
from app.models.document import Document
from app.models.authorization import Authorization
from app.models.cash_register_session import CashRegisterSession
from app.models.cash_transaction import CashTransaction
from app.models.service_package import ServicePackage, ServicePackageItem
from app.models.inventory_package import InventoryPackage, InventoryPackageItem
from app.models.audit_log import AuditLog, VoidRequest
from datetime import datetime, timedelta

try:
    from app.models.payroll_payment import PayrollPayment
except ModuleNotFoundError:
    PayrollPayment = None

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


class PayrollPaymentCreate(BaseModel):
    employee_id: int
    period: str
    base_salary: Decimal
    bonus: Decimal = Decimal("0")
    deductions: Decimal = Decimal("0")
    notes: Optional[str] = None
    status: str = "paid"


class TeamMemberUpdate(BaseModel):
    full_name: str


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


def _serialize_user_name(user: User | None) -> str | None:
    if not user:
        return None
    return user.full_name or user.email.split("@")[0]


def _ensure_feature_access(user: User, feature: Feature):
    if has_feature(user.plan, feature, user.role, is_parent_account=user.parent_user_id is None):
        return
    raise HTTPException(status_code=403, detail="No tienes permisos para esta función")


def _resolve_payroll_owner_id(user: User, db: Session) -> int:
    return resolve_collaboration_owner_id(
        user,
        db,
        allow_external=False,
        allowed_owner_plans={"pro", "max", "admin"},
    )


def _ensure_payroll_module_available():
    if PayrollPayment is None:
        raise HTTPException(
            status_code=503,
            detail="El modulo de nomina no esta disponible en este despliegue",
        )


def _serialize_payroll_payment(record):
    return {
        "id": record.id,
        "owner_user_id": record.owner_user_id,
        "employee_id": record.employee_user_id,
        "employee_name": _serialize_user_name(record.employee),
        "employee_email": record.employee.email if record.employee else None,
        "created_by_user_id": record.created_by_user_id,
        "created_by_name": _serialize_user_name(record.created_by),
        "period": record.period,
        "base_salary": float(record.base_salary or 0),
        "bonus": float(record.bonus or 0),
        "deductions": float(record.deductions or 0),
        "net_amount": float(record.net_amount or 0),
        "status": record.status,
        "notes": record.notes,
        "paid_at": record.paid_at.isoformat() if record.paid_at else None,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
    }


# ============== MASTER ADMIN ENDPOINTS ==============

@router.get("/master/dashboard")
def master_dashboard(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Panel maestro del administrador - Solo para admins globales"""
    from sqlalchemy import func
    
    try:
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
        
        # Get all existing plans dynamically
        all_plans = db.query(User.plan).distinct().all()
        plan_names = [p[0] for p in all_plans if p[0] is not None]
        
        users_by_plan = {}
        for plan in plan_names:
            count = db.query(func.count(User.id)).filter(User.plan == plan).scalar() or 0
            users_by_plan[plan] = count
        
        # Ensure common plans are included even if count is 0
        for plan in ["free", "starter", "pro", "max"]:
            if plan not in users_by_plan:
                users_by_plan[plan] = 0
        
        users_by_role = {}
        for role in ["viewer", "manager", "admin"]:
            count = db.query(func.count(User.id)).filter(User.role == role).scalar() or 0
            users_by_role[role] = count

        now = datetime.utcnow()
        free_trial_active = 0
        free_trial_consumed = 0
        free_trial_not_started = 0

        free_owners = db.query(User).filter(User.plan == "free").all()
        for u in free_owners:
            if u.role == "admin" or u.parent_user_id:
                continue
            trial_used = bool(getattr(u, "free_trial_used", False))
            trial_started_at = getattr(u, "free_trial_started_at", None)
            if trial_used:
                free_trial_consumed += 1
                continue
            if not trial_started_at:
                free_trial_not_started += 1
                continue
            if now <= trial_started_at + timedelta(days=15):
                free_trial_active += 1
            else:
                free_trial_consumed += 1

        pending_payment_accounts = db.query(func.count(User.id)).filter(
            User.plan != "free",
            User.plan != "admin",
            User.plan_paid == False,
        ).scalar() or 0
        
        return {
            "status": "ok",
            "role": "master_admin",
            "statistics": {
                "total_users": total_users,
                "active_users": active_users,
                "by_plan": users_by_plan,
                "by_role": users_by_role,
                "plan_lifecycle": {
                    "free_trial_active": free_trial_active,
                    "free_trial_consumed": free_trial_consumed,
                    "free_trial_not_started": free_trial_not_started,
                    "pending_payment_accounts": pending_payment_accounts,
                },
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
    limit: int = 50,
    include_inactive: bool = True
):
    """Lista todos los usuarios del sistema (Master Admin only)"""
    try:
        query = db.query(User)
        if not include_inactive:
            query = query.filter(User.is_active == True)
            
        users = query.offset(skip).limit(limit).all()
        total = query.count()
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "users": [
                {
                    "id": u.id,
                    "email": u.email,
                    "full_name": u.full_name,
                    "role": u.role,
                    "plan": u.plan,
                    "is_active": u.is_active,
                    "business_type": u.business_type,
                    "parent_user_id": u.parent_user_id,
                    "parent_email": db.query(User.email).filter(User.id == u.parent_user_id).scalar() if u.parent_user_id else None,
                    "created_at": u.created_at.isoformat(),
                    "updated_at": u.updated_at.isoformat(),
                }
                for u in users
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/master/trials")
def list_trial_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lista usuarios en trial con información detallada (Master Admin only)"""
    import math
    try:
        now = datetime.utcnow()
        users = db.query(User).filter(
            User.plan == "free",
            User.role != "admin",
            User.parent_user_id == None,
            User.free_trial_started_at != None
        ).order_by(User.free_trial_started_at.desc()).all()
        
        trial_data = []
        for u in users:
            trial_started_at = u.free_trial_started_at
            trial_ends_at = trial_started_at + timedelta(days=15)
            is_trial_active = not bool(u.free_trial_used) and (now <= trial_ends_at)
            
            if is_trial_active:
                hours_remaining = (trial_ends_at - now).total_seconds() / 3600
                days_remaining = math.ceil(hours_remaining / 24)
            else:
                hours_remaining = 0
                days_remaining = 0
            
            trial_data.append({
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name or "N/A",
                "business_type": u.business_type,
                "trial_started_at": trial_started_at.isoformat(),
                "trial_ends_at": trial_ends_at.isoformat(),
                "is_active": is_trial_active,
                "hours_remaining": round(hours_remaining, 1),
                "days_remaining": days_remaining,
                "status": "active" if is_trial_active else "expired",
                "created_at": u.created_at.isoformat(),
            })
        
        active_trials = sum(1 for t in trial_data if t["is_active"])
        expired_trials = sum(1 for t in trial_data if not t["is_active"])
        
        return {
            "total": len(trial_data),
            "active_count": active_trials,
            "expired_count": expired_trials,
            "trials": trial_data
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

        old_role = user.role
        if old_role == new_role:
            return {
                "success": True,
                "message": f"El usuario ya tiene el rol {new_role}",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "role": user.role
                }
            }
        
        user.role = new_role
        user.updated_at = datetime.utcnow()

        # Invalidate all sessions because access JWTs embed the role claim.
        db.query(RefreshToken).filter(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked_at.is_(None),
        ).update({"revoked_at": datetime.utcnow()})

        db.commit()
        db.refresh(user)
        send_role_changed_alert(user.email, old_role, new_role)
        
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


@router.put("/team/members/{member_id}")
def update_team_member(
    member_id: int,
    payload: TeamMemberUpdate,
    user: User = Depends(is_team_owner),
    db: Session = Depends(get_db)
):
    try:
        team_user = db.query(TeamUser).filter(
            TeamUser.team_owner_id == user.id,
            TeamUser.member_user_id == member_id,
            TeamUser.is_active == True
        ).first()

        if not team_user or not team_user.member:
            raise HTTPException(status_code=404, detail="Miembro del equipo no encontrado")

        cleaned_name = (payload.full_name or "").strip()
        if len(cleaned_name) < 2:
            raise HTTPException(status_code=400, detail="El nombre completo es obligatorio")

        team_user.member.full_name = cleaned_name
        team_user.member.updated_at = datetime.utcnow()
        db.add(team_user.member)
        db.commit()
        db.refresh(team_user.member)

        return {
            "success": True,
            "member": {
                "id": team_user.member.id,
                "email": team_user.member.email,
                "full_name": team_user.member.full_name,
            }
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/master/users/{user_id}/activate")
def activate_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Reactiva una cuenta de usuario desactivada (Master Admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        if user.is_active:
            raise HTTPException(status_code=400, detail="El usuario ya está activo")

        user.is_active = True
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        return {
            "success": True,
            "message": f"Usuario {user.email} reactivado correctamente.",
            "user": {
                "id": user.id,
                "email": user.email,
                "is_active": user.is_active
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/master/users/{user_id}/sub-users")
def list_sub_users(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    include_inactive: bool = True
):
    """Lista los sub-usuarios de un usuario padre específico (Master Admin only)"""
    try:
        parent = db.query(User).filter(User.id == user_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Usuario padre no encontrado")
        
        query = db.query(User).filter(User.parent_user_id == user_id)
        if not include_inactive:
            query = query.filter(User.is_active == True)
            
        sub_users = query.all()
        
        return {
            "parent_user": {
                "id": parent.id,
                "email": parent.email,
                "plan": parent.plan
            },
            "total_sub_users": len(sub_users),
            "sub_users": [
                {
                    "id": u.id,
                    "email": u.email,
                    "full_name": u.full_name,
                    "role": u.role,
                    "is_active": u.is_active,
                    "created_at": u.created_at.isoformat(),
                }
                for u in sub_users
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/master/users/{user_id}")
def deactivate_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Desactiva una cuenta de usuario (Master Admin only)
    
    Cambia is_active a False sin eliminar datos.
    Las transacciones permanecen asociadas al usuario para auditoría.
    """
    try:
        if user_id == admin.id:
            raise HTTPException(status_code=400, detail="No puedes desactivarte a ti mismo")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        if not user.is_active:
            raise HTTPException(status_code=400, detail="El usuario ya está inactivo")

        # Solo cambiar el estado a inactivo
        user.is_active = False
        db.commit()

        return {
            "success": True,
            "message": f"Usuario {user.email} desactivado correctamente.",
            "info": "El usuario y todas sus transacciones permanecen en el sistema para auditoría."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============== TEAM MANAGEMENT ENDPOINTS ==============

@router.delete("/master/users/{user_id}/permanent")
def permanently_delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Elimina permanentemente una cuenta fallida/sin datos (Master Admin only).

    Solo permite borrado total cuando la cuenta (y sus subusuarios) no tiene
    registros operativos. Si existen movimientos, se devuelve 409 y debe usarse
    desactivación por auditoría.
    """
    try:
        if user_id == admin.id:
            raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")

        target = db.query(User).filter(User.id == user_id).first()
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        email_deleted = target.email

        # Include direct sub-users in dependency checks and deletion
        sub_ids = [u.id for u in db.query(User.id).filter(User.parent_user_id == user_id).all()]
        all_ids = [user_id] + sub_ids

        # Importar modelos de gobernanza
        from app.models.governance import GovernanceEntity, LegalEntity, Dignitary, UserConsent, PolicyVersion

        dependencies = {
            "clientes": db.query(Customer).filter(Customer.user_id.in_(all_ids)).count(),
            "servicios": db.query(Service).filter(Service.user_id.in_(all_ids)).count(),
            "pagos": db.query(Payment).filter(Payment.user_id.in_(all_ids)).count(),
            "facturas": db.query(Invoice).filter(Invoice.user_id.in_(all_ids)).count(),
            "inventario_categorias": db.query(InventoryCategory).filter(InventoryCategory.user_id.in_(all_ids)).count(),
            "inventario_items": db.query(InventoryItem).filter(InventoryItem.user_id.in_(all_ids)).count(),
            "paquetes_inventario": db.query(InventoryPackage).filter(InventoryPackage.user_id.in_(all_ids)).count(),
            "paquetes_servicios": db.query(ServicePackage).filter(ServicePackage.user_id.in_(all_ids)).count(),
            "documentos": db.query(Document).filter(
                or_(Document.user_id.in_(all_ids), Document.created_by_user_id.in_(all_ids))
            ).count(),
            "autorizaciones": db.query(Authorization).filter(
                or_(
                    Authorization.user_id.in_(all_ids),
                    Authorization.requested_by_user_id.in_(all_ids),
                    Authorization.assigned_approver_user_id.in_(all_ids),
                    Authorization.resolved_by_user_id.in_(all_ids),
                )
            ).count(),
            "sesiones_caja": db.query(CashRegisterSession).filter(CashRegisterSession.user_id.in_(all_ids)).count(),
            "movimientos_caja": db.query(CashTransaction).filter(
                or_(CashTransaction.user_id.in_(all_ids), CashTransaction.voided_by_user_id.in_(all_ids))
            ).count(),
            "auditoria": db.query(AuditLog).filter(AuditLog.user_id.in_(all_ids)).count(),
            "solicitudes_anulacion": db.query(VoidRequest).filter(
                or_(VoidRequest.requested_by.in_(all_ids), VoidRequest.resolved_by.in_(all_ids))
            ).count(),
            # Tablas de gobernanza
            "entidades_gobernanza": db.query(GovernanceEntity).filter(GovernanceEntity.owner_user_id.in_(all_ids)).count(),
            "entidades_legales": db.query(LegalEntity).filter(LegalEntity.owner_user_id.in_(all_ids)).count(),
            "dignatarios": db.query(Dignitary).filter(
                or_(Dignitary.owner_user_id.in_(all_ids), Dignitary.user_id.in_(all_ids))
            ).count(),
            "consents": db.query(UserConsent).filter(UserConsent.user_id.in_(all_ids)).count(),
        }

        used_dependencies = {k: v for k, v in dependencies.items() if v > 0}
        if used_dependencies:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "La cuenta tiene datos operativos y no puede eliminarse permanentemente.",
                    "hint": "Usa desactivar usuario para conservar auditoria.",
                    "dependencies": used_dependencies,
                },
            )

        # If no operational data exists, purge lightweight references then users
        from app.models.governance import GovernanceEntity, LegalEntity, Dignitary, UserConsent

        db.query(Notification).filter(Notification.user_id.in_(all_ids)).delete(synchronize_session=False)
        db.query(BusinessConfiguration).filter(BusinessConfiguration.user_id.in_(all_ids)).delete(synchronize_session=False)
        db.query(TeamUser).filter(
            or_(TeamUser.team_owner_id.in_(all_ids), TeamUser.member_user_id.in_(all_ids))
        ).delete(synchronize_session=False)
        # Limpiar tablas de gobernanza
        db.query(Dignitary).filter(Dignitary.owner_user_id.in_(all_ids)).delete(synchronize_session=False)
        db.query(LegalEntity).filter(LegalEntity.owner_user_id.in_(all_ids)).delete(synchronize_session=False)
        db.query(GovernanceEntity).filter(GovernanceEntity.owner_user_id.in_(all_ids)).delete(synchronize_session=False)
        db.query(UserConsent).filter(UserConsent.user_id.in_(all_ids)).delete(synchronize_session=False)

        db.query(User).filter(User.parent_user_id == user_id).delete(synchronize_session=False)
        db.query(User).filter(User.id == user_id).delete(synchronize_session=False)

        db.commit()

        return {
            "success": True,
            "message": f"Usuario {email_deleted} y todos sus datos han sido eliminados permanentemente.",
            "deleted_sub_users": len(sub_ids)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============== TEAM MANAGEMENT ENDPOINTS ==============


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
                    "full_name": m.member.full_name,
                    "role_in_team": m.role_in_team,
                    "relationship_type": "internal_user" if m.member.parent_user_id == user.id else "external_partner_owner",
                    "relationship_label": "Usuario Interno" if m.member.parent_user_id == user.id else "Socio Externo",
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
        normalized_plan = normalize_plan(user.plan)
        if user.role != "admin" and normalized_plan not in {"pro", "max", "admin"}:
            raise HTTPException(
                status_code=403,
                detail="Invitar cuentas dueñas externas está disponible desde plan PRO"
            )

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
            raise HTTPException(status_code=404, detail="Cuenta no encontrada. Invitar miembro requiere una cuenta existente tipo dueño")
        
        if member.id == user.id:
            raise HTTPException(status_code=400, detail="No puedes invitarte a ti mismo")

        # Invitar miembro = socio externo con cuenta dueña independiente.
        if member.parent_user_id == user.id:
            raise HTTPException(
                status_code=400,
                detail="Esta cuenta ya es usuario interno de tu negocio. Usa su rol interno en +Crear Usuario"
            )
        if member.parent_user_id is not None and member.parent_user_id != user.id:
            raise HTTPException(
                status_code=400,
                detail="Solo puedes invitar cuentas dueñas independientes (no subcuentas de otro negocio)"
            )

        if role not in ["partner", "manager", "viewer"]:
            raise HTTPException(status_code=400, detail="Rol inválido para socio invitado")
        
        existing = db.query(TeamUser).filter(
            TeamUser.team_owner_id == user.id,
            TeamUser.member_user_id == member.id
        ).first()

        if existing:
            # Permitir re-invitación si el vínculo previo no está activo.
            if (not existing.is_active) or existing.status in ["invited", "suspended"]:
                existing.role_in_team = role
                existing.status = "invited"
                existing.is_active = True
                existing.invited_at = datetime.utcnow()
                existing.joined_at = None

                db.add(Notification(
                    user_id=member.id,
                    type="team_invite",
                    title=f"Invitación de equipo: {user.email}",
                    message=f"{user.email} te invitó como {role}. Puedes aceptar o declinar.",
                    reference_id=existing.id,
                    reference_type="team_invite",
                ))

                db.commit()
                db.refresh(existing)
                return {
                    "success": True,
                    "message": f"Reinvitación enviada a {email}",
                    "invitation": {
                        "id": existing.id,
                        "email": member.email,
                        "role": role,
                        "status": "invited",
                        "invited_at": existing.invited_at.isoformat()
                    }
                }

            raise HTTPException(status_code=400, detail="Este usuario ya está en tu equipo")
        
        team_user = TeamUser(
            team_owner_id=user.id,
            member_user_id=member.id,
            role_in_team=role,
            status="invited"
        )

        db.add(team_user)
        db.flush()

        db.add(Notification(
            user_id=member.id,
            type="team_invite",
            title=f"Invitación de equipo: {user.email}",
            message=f"{user.email} te invitó como {role}. Puedes aceptar o declinar.",
            reference_id=team_user.id,
            reference_type="team_invite",
        ))

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
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/team/create")
def create_team_user(
    full_name: str,
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

        if role not in ["viewer", "editor", "manager"]:
            raise HTTPException(status_code=400, detail="Rol inválido para usuario interno")

        cleaned_name = full_name.strip()
        if len(cleaned_name) < 2:
            raise HTTPException(status_code=400, detail="El nombre completo es obligatorio")

        # Crear usuario hijo con onboarding ya completado
        new_user = User(
            email=email,
            full_name=cleaned_name,
            hashed_password=hash_password(password),
            role=role,
            plan=user.plan,
            is_active=True,
            business_type=user.business_type,
            parent_user_id=user.id,
            onboarding_completed=True  # Sub-usuarios saltan el onboarding
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Copiar BusinessConfiguration del padre al hijo
        parent_config = db.query(BusinessConfiguration).filter(
            BusinessConfiguration.user_id == user.id
        ).first()
        
        if parent_config:
            child_config = BusinessConfiguration(
                user_id=new_user.id,
                business_type=parent_config.business_type,
                business_name=parent_config.business_name,
                business_description=parent_config.business_description,
                customer_label=parent_config.customer_label,
                pet_label=parent_config.pet_label,
                appointment_label=parent_config.appointment_label,
                pet_fields_enabled=parent_config.pet_fields_enabled,
                customer_fields_enabled=parent_config.customer_fields_enabled,
                custom_fields=parent_config.custom_fields,
                has_pet_relationship=parent_config.has_pet_relationship
            )
            db.add(child_config)
            db.commit()

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
                "full_name": new_user.full_name,
                "role": new_user.role,
                "plan": new_user.plan
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/payroll")
def list_team_payroll(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_payroll_module_available()

    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    _ensure_feature_access(user, Feature.VIEW_PAYROLL)
    owner_id = _resolve_payroll_owner_id(user, db)

    records = (
        db.query(PayrollPayment)
        .filter(PayrollPayment.owner_user_id == owner_id)
        .order_by(PayrollPayment.created_at.desc())
        .limit(200)
        .all()
    )
    return [_serialize_payroll_payment(record) for record in records]


@router.post("/team/payroll")
def create_team_payroll_payment(
    payload: PayrollPaymentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_payroll_module_available()

    user = db.query(User).filter(User.id == int(current_user["id"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    _ensure_feature_access(user, Feature.MANAGE_PAYROLL)
    owner_id = _resolve_payroll_owner_id(user, db)
    scope_user_ids = get_scope_user_ids(owner_id, db)

    employee = db.query(User).filter(User.id == payload.employee_id).first()
    if not employee or employee.parent_user_id != owner_id or employee.id not in scope_user_ids:
        raise HTTPException(status_code=404, detail="Empleado no encontrado en tu equipo")

    cleaned_period = (payload.period or "").strip()
    if len(cleaned_period) != 7 or cleaned_period[4] != "-":
        raise HTTPException(status_code=400, detail="El periodo debe tener formato YYYY-MM")

    base_salary = Decimal(payload.base_salary or 0)
    bonus = Decimal(payload.bonus or 0)
    deductions = Decimal(payload.deductions or 0)
    if base_salary <= 0:
        raise HTTPException(status_code=400, detail="El salario base debe ser mayor que cero")
    if bonus < 0 or deductions < 0:
        raise HTTPException(status_code=400, detail="Bonificaciones y deducciones no pueden ser negativas")

    net_amount = base_salary + bonus - deductions
    if net_amount < 0:
        raise HTTPException(status_code=400, detail="El neto no puede quedar negativo")

    status_value = (payload.status or "paid").strip().lower()
    if status_value not in {"paid", "pending"}:
        raise HTTPException(status_code=400, detail="Estado de nómina inválido")

    record = PayrollPayment(
        owner_user_id=owner_id,
        employee_user_id=employee.id,
        created_by_user_id=user.id,
        period=cleaned_period,
        base_salary=base_salary,
        bonus=bonus,
        deductions=deductions,
        net_amount=net_amount,
        status=status_value,
        notes=(payload.notes or "").strip() or None,
        paid_at=datetime.utcnow() if status_value == "paid" else None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _serialize_payroll_payment(record)


@router.post("/team/accept-invite/{invitation_id}")
def accept_team_invite(
    invitation_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Acepta una invitación al equipo"""
    try:
        user = db.query(User).filter(User.id == int(current_user["id"])).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        invite = db.query(TeamUser).filter(
            TeamUser.id == invitation_id,
            TeamUser.member_user_id == user.id,
            TeamUser.status == "invited"
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
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/team/decline-invite/{invitation_id}")
def decline_team_invite(
    invitation_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Declina una invitación al equipo"""
    try:
        user = db.query(User).filter(User.id == int(current_user["id"])).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        invite = db.query(TeamUser).filter(
            TeamUser.id == invitation_id,
            TeamUser.member_user_id == user.id,
            TeamUser.status == "invited"
        ).first()

        if not invite:
            raise HTTPException(status_code=404, detail="Invitación no encontrada")

        invite.status = "suspended"
        invite.is_active = False
        db.commit()

        return {
            "success": True,
            "message": "Invitación declinada"
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/team/members/{member_id}")
def deactivate_team_member(
    member_id: int,
    user: User = Depends(is_team_owner),
    db: Session = Depends(get_db)
):
    """Desactiva un miembro del equipo en lugar de eliminarlo"""
    try:
        team_user = db.query(TeamUser).filter(
            TeamUser.team_owner_id == user.id,
            TeamUser.member_user_id == member_id
        ).first()
        
        if not team_user:
            raise HTTPException(status_code=404, detail="Miembro del equipo no encontrado")
        
        # Desactivar en lugar de eliminar
        team_user.is_active = False
        team_user.status = "suspended"
        db.commit()
        
        return {"success": True, "message": "Miembro desactivado del equipo"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/team/members/{member_id}/activate")
def activate_team_member(
    member_id: int,
    user: User = Depends(is_team_owner),
    db: Session = Depends(get_db)
):
    """Reactiva un miembro del equipo"""
    try:
        team_user = db.query(TeamUser).filter(
            TeamUser.team_owner_id == user.id,
            TeamUser.member_user_id == member_id
        ).first()
        
        if not team_user:
            raise HTTPException(status_code=404, detail="Miembro del equipo no encontrado")
        
        # Reactivar
        team_user.is_active = True
        team_user.status = "active"
        db.commit()
        
        return {"success": True, "message": "Miembro reactivado"}
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
    plan_for_display = user.plan
    plan_for_features = user.plan
    plan_for_limits = user.plan
    if user.role == "admin":
        plan_for_display = "max"
        plan_for_features = "admin"
        plan_for_limits = "max"
    return {
        "plan": plan_for_display,
        "role": user.role,
        "features": get_available_features(
            plan_for_features,
            user.role,
            is_parent_account=not bool(user.parent_user_id),
        ),
        "limits": get_plan_limits(plan_for_limits)
    }


# ============== MOVIMIENTOS POR USUARIO HIJO ==============

@router.get("/team/movements/summary")
def get_team_movements_summary(
    user: User = Depends(is_team_owner),
    db: Session = Depends(get_db),
    include_inactive: bool = False
):
    """Obtiene resumen de movimientos de cada miembro del equipo"""
    try:
        # Obtener miembros del equipo
        query = db.query(TeamUser).filter(TeamUser.team_owner_id == user.id)
        if not include_inactive:
            query = query.filter(TeamUser.is_active == True)
        
        team_members = query.all()
        
        summary = []
        for member in team_members:
            member_user = db.query(User).filter(User.id == member.member_user_id).first()
            if not member_user:
                continue
                
            # Contar movimientos por tipo
            payments_count = db.query(Payment).filter(Payment.user_id == member_user.id).count()
            customers_count = db.query(Customer).filter(Customer.user_id == member_user.id).count()
            appointments_count = db.query(Appointment).join(Customer).filter(
                Customer.user_id == member_user.id
            ).count()
            
            # Calcular ingresos totales
            payments = db.query(Payment).filter(
                Payment.user_id == member_user.id,
                Payment.status == "completed"
            ).all()
            total_revenue = sum(p.amount for p in payments)
            
            summary.append({
                "member_id": member_user.id,
                "member_email": member_user.email,
                "role": member.role_in_team,
                "status": member.status,
                "is_active": member.is_active,
                "statistics": {
                    "payments": payments_count,
                    "customers": customers_count,
                    "appointments": appointments_count,
                    "total_revenue": float(total_revenue)
                }
            })
        
        return {
            "team_owner": {
                "id": user.id,
                "email": user.email
            },
            "total_members": len(summary),
            "members": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/movements/by-member/{member_id}")
def get_member_movements(
    member_id: int,
    user: User = Depends(is_team_owner),
    db: Session = Depends(get_db),
    movement_type: str = "all"  # payments, customers, appointments, all
):
    """Obtiene movimientos detallados de un miembro específico del equipo"""
    try:
        # Verificar que el miembro pertenece al equipo
        team_user = db.query(TeamUser).filter(
            TeamUser.team_owner_id == user.id,
            TeamUser.member_user_id == member_id
        ).first()
        
        if not team_user:
            raise HTTPException(status_code=404, detail="Miembro no encontrado en tu equipo")
        
        member = db.query(User).filter(User.id == member_id).first()
        result = {
            "member": {
                "id": member.id,
                "email": member.email,
                "role": team_user.role_in_team,
                "status": team_user.status,
                "is_active": team_user.is_active
            },
            "movements": {}
        }
        
        # Pagos
        if movement_type in ["payments", "all"]:
            payments = db.query(Payment).filter(Payment.user_id == member_id).all()
            result["movements"]["payments"] = [
                {
                    "id": p.id,
                    "amount": float(p.amount),
                    "method": p.method,
                    "status": p.status,
                    "notes": p.notes,
                    "created_at": p.created_at.isoformat(),
                    "paid_at": p.paid_at.isoformat() if p.paid_at else None
                }
                for p in payments
            ]
        
        # Clientes
        if movement_type in ["customers", "all"]:
            customers = db.query(Customer).filter(Customer.user_id == member_id).all()
            result["movements"]["customers"] = [
                {
                    "id": c.id,
                    "full_name": c.full_name,
                    "email": c.email,
                    "phone": c.phone,
                    "created_at": c.created_at.isoformat()
                }
                for c in customers
            ]
        
        # Citas
        if movement_type in ["appointments", "all"]:
            appointments = db.query(Appointment).join(Customer).filter(
                Customer.user_id == member_id
            ).all()
            result["movements"]["appointments"] = [
                {
                    "id": a.id,
                    "customer_id": a.customer_id,
                    "customer_name": a.customer.full_name if a.customer else None,
                    "scheduled_at": a.scheduled_at.isoformat(),
                    "status": a.status,
                    "notes": a.notes,
                    "created_at": a.created_at.isoformat()
                }
                for a in appointments
            ]
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
