from fastapi import Depends, HTTPException
from app.core.security import get_current_user

ROLE_PERMISSIONS = {
    "admin": {"users.read", "users.create", "users.update", "users.delete", "plans.manage"},
    "manager": {"users.read", "users.create", "users.update"},
    "team": {"users.read"},
    "viewer": set()
}

def require_permission(permission: str):
    def checker(user=Depends(get_current_user)):
        if permission not in ROLE_PERMISSIONS.get(user["role"], set()):
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker
