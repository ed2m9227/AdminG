from fastapi import Depends, HTTPException, status
from app.core.permissions import ROLE_PERMISSIONS
from app.core.plans import PLAN_FEATURES
from app.core.security import get_current_user

def requiere_permission(permission: str, module: str):
    def checker(user=Depends(get_current_user)):
        role = user["role"]
        plan = user["plan"]

        # Verificar módulo habilitado en el plan
        if module not in PLAN_FEATURES.get(plan, []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Feature not available in your plan")

        # Verificar permisos por rol
        role_perms = ROLE_PERMISSIONS.get(role, [])
        
        if "*" in role_perms:
            return user
        
        if permission not in role_perms and f"{module}:" not in role_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions")
            return user
        return checker