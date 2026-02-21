"""
Feature Gating System
Controla qué funciones están disponibles según el plan del usuario
"""

from typing import Dict, List, Set
from enum import Enum

class Feature(str, Enum):
    """Enumeración de features disponibles en la plataforma"""
    # Customers
    VIEW_CUSTOMERS = "view_customers"
    CREATE_CUSTOMERS = "create_customers"
    EDIT_CUSTOMERS = "edit_customers"
    DELETE_CUSTOMERS = "delete_customers"
    EXPORT_CUSTOMERS = "export_customers"
    
    # Appointments
    VIEW_APPOINTMENTS = "view_appointments"
    CREATE_APPOINTMENTS = "create_appointments"
    EDIT_APPOINTMENTS = "edit_appointments"
    DELETE_APPOINTMENTS = "delete_appointments"
    CANCEL_APPOINTMENTS = "cancel_appointments"
    
    # Inventory
    VIEW_INVENTORY = "view_inventory"
    CREATE_PRODUCTS = "create_products"
    EDIT_PRODUCTS = "edit_products"
    DELETE_PRODUCTS = "delete_products"
    TRACK_STOCK = "track_stock"
    
    # Payments
    VIEW_PAYMENTS = "view_payments"
    CREATE_PAYMENTS = "create_payments"
    REFUND_PAYMENTS = "refund_payments"
    
    # Reports
    VIEW_REPORTS = "view_reports"
    EXPORT_REPORTS = "export_reports"
    ADVANCED_ANALYTICS = "advanced_analytics"
    
    # Cash Register
    USE_CASHREGISTER = "use_cashregister"
    OPEN_REGISTER = "open_register"
    CLOSE_REGISTER = "close_register"
    
    # Users Management (Team)
    MANAGE_TEAM_USERS = "manage_team_users"
    VIEW_TEAM = "view_team"
    INVITE_USERS = "invite_users"
    
    # Admin (Master only)
    ADMIN_PANEL = "admin_panel"
    MANAGE_ALL_USERS = "manage_all_users"
    VIEW_SYSTEM_STATS = "view_system_stats"
    MANAGE_PLANS = "manage_plans"
    VIEW_BILLING = "view_billing"


# Plan Features Mapping
PLAN_FEATURES: Dict[str, Set[Feature]] = {
    "free": {
        # Free plan is READ-ONLY demo mode with very limited access
        Feature.VIEW_CUSTOMERS,
        Feature.VIEW_APPOINTMENTS,
    },
    "basic": {
        # Basic plan (AdminG_Basic) has full CRUD for customers, appointments, payments, basic reports
        # Basic plan (AdminG_Basic) has full CRUD for customers, appointments, payments, basic reports
        Feature.VIEW_CUSTOMERS,
        Feature.CREATE_CUSTOMERS,
        Feature.EDIT_CUSTOMERS,
        Feature.DELETE_CUSTOMERS,
        Feature.VIEW_APPOINTMENTS,
        Feature.CREATE_APPOINTMENTS,
        Feature.EDIT_APPOINTMENTS,
        Feature.DELETE_APPOINTMENTS,
        Feature.VIEW_PAYMENTS,
        Feature.CREATE_PAYMENTS,
        Feature.VIEW_REPORTS,
        # NO inventory, NO advanced features, 1 team member only
    },
    "AdminG_Basic": {  # Explicit mapping
        Feature.VIEW_CUSTOMERS,
        Feature.CREATE_CUSTOMERS,
        Feature.EDIT_CUSTOMERS,
        Feature.DELETE_CUSTOMERS,
        Feature.VIEW_APPOINTMENTS,
        Feature.CREATE_APPOINTMENTS,
        Feature.EDIT_APPOINTMENTS,
        Feature.DELETE_APPOINTMENTS,
        Feature.VIEW_PAYMENTS,
        Feature.CREATE_PAYMENTS,
        Feature.VIEW_REPORTS,
    },
    "AdminG_Plus": {  # Explicit mapping
        Feature.VIEW_CUSTOMERS,
        Feature.CREATE_CUSTOMERS,
        Feature.EDIT_CUSTOMERS,
        Feature.DELETE_CUSTOMERS,
        Feature.EXPORT_CUSTOMERS,
        Feature.VIEW_APPOINTMENTS,
        Feature.CREATE_APPOINTMENTS,
        Feature.EDIT_APPOINTMENTS,
        Feature.DELETE_APPOINTMENTS,
        Feature.CANCEL_APPOINTMENTS,
        Feature.VIEW_PAYMENTS,
        Feature.CREATE_PAYMENTS,
        Feature.REFUND_PAYMENTS,
        Feature.VIEW_REPORTS,
        Feature.EXPORT_REPORTS,
        Feature.VIEW_TEAM,
        Feature.MANAGE_TEAM_USERS,
    },
    "plus": {
        Feature.VIEW_CUSTOMERS,
        Feature.CREATE_CUSTOMERS,
        Feature.EDIT_CUSTOMERS,
        Feature.DELETE_CUSTOMERS,
        Feature.VIEW_APPOINTMENTS,
        Feature.CREATE_APPOINTMENTS,
        Feature.EDIT_APPOINTMENTS,
        Feature.DELETE_APPOINTMENTS,
        Feature.VIEW_INVENTORY,
        Feature.CREATE_PRODUCTS,
        Feature.EDIT_PRODUCTS,
        Feature.DELETE_PRODUCTS,
        Feature.TRACK_STOCK,
        Feature.VIEW_PAYMENTS,
        Feature.CREATE_PAYMENTS,
        Feature.REFUND_PAYMENTS,
        Feature.VIEW_REPORTS,
        Feature.EXPORT_REPORTS,
        Feature.USE_CASHREGISTER,
        Feature.OPEN_REGISTER,
        Feature.CLOSE_REGISTER,
        Feature.VIEW_TEAM,
        Feature.MANAGE_TEAM_USERS,
        Feature.INVITE_USERS,
    },
    "start": {
        Feature.VIEW_CUSTOMERS,
        Feature.CREATE_CUSTOMERS,
        Feature.EDIT_CUSTOMERS,
        Feature.DELETE_CUSTOMERS,
        Feature.EXPORT_CUSTOMERS,
        Feature.VIEW_APPOINTMENTS,
        Feature.CREATE_APPOINTMENTS,
        Feature.EDIT_APPOINTMENTS,
        Feature.DELETE_APPOINTMENTS,
        Feature.CANCEL_APPOINTMENTS,
        Feature.VIEW_INVENTORY,
        Feature.CREATE_PRODUCTS,
        Feature.EDIT_PRODUCTS,
        Feature.DELETE_PRODUCTS,
        Feature.TRACK_STOCK,
        Feature.VIEW_PAYMENTS,
        Feature.CREATE_PAYMENTS,
        Feature.REFUND_PAYMENTS,
        Feature.VIEW_REPORTS,
        Feature.EXPORT_REPORTS,
        Feature.ADVANCED_ANALYTICS,
        Feature.USE_CASHREGISTER,
        Feature.OPEN_REGISTER,
        Feature.CLOSE_REGISTER,
        Feature.VIEW_TEAM,
        Feature.MANAGE_TEAM_USERS,
        Feature.INVITE_USERS,
    },
    "max": {
        # All features except admin-only
        Feature.VIEW_CUSTOMERS,
        Feature.CREATE_CUSTOMERS,
        Feature.EDIT_CUSTOMERS,
        Feature.DELETE_CUSTOMERS,
        Feature.EXPORT_CUSTOMERS,
        Feature.VIEW_APPOINTMENTS,
        Feature.CREATE_APPOINTMENTS,
        Feature.EDIT_APPOINTMENTS,
        Feature.DELETE_APPOINTMENTS,
        Feature.CANCEL_APPOINTMENTS,
        Feature.VIEW_INVENTORY,
        Feature.CREATE_PRODUCTS,
        Feature.EDIT_PRODUCTS,
        Feature.DELETE_PRODUCTS,
        Feature.TRACK_STOCK,
        Feature.VIEW_PAYMENTS,
        Feature.CREATE_PAYMENTS,
        Feature.REFUND_PAYMENTS,
        Feature.VIEW_REPORTS,
        Feature.EXPORT_REPORTS,
        Feature.ADVANCED_ANALYTICS,
        Feature.USE_CASHREGISTER,
        Feature.OPEN_REGISTER,
        Feature.CLOSE_REGISTER,
        Feature.VIEW_TEAM,
        Feature.MANAGE_TEAM_USERS,
        Feature.INVITE_USERS,
    },
    "admin": {
        # Master admin - all features
        Feature.ADMIN_PANEL,
        Feature.MANAGE_ALL_USERS,
        Feature.VIEW_SYSTEM_STATS,
        Feature.MANAGE_PLANS,
        Feature.VIEW_BILLING,
        # Plus all user features
        Feature.VIEW_CUSTOMERS,
        Feature.CREATE_CUSTOMERS,
        Feature.EDIT_CUSTOMERS,
        Feature.DELETE_CUSTOMERS,
        Feature.EXPORT_CUSTOMERS,
        Feature.VIEW_APPOINTMENTS,
        Feature.CREATE_APPOINTMENTS,
        Feature.EDIT_APPOINTMENTS,
        Feature.DELETE_APPOINTMENTS,
        Feature.CANCEL_APPOINTMENTS,
        Feature.VIEW_INVENTORY,
        Feature.CREATE_PRODUCTS,
        Feature.EDIT_PRODUCTS,
        Feature.DELETE_PRODUCTS,
        Feature.TRACK_STOCK,
        Feature.VIEW_PAYMENTS,
        Feature.CREATE_PAYMENTS,
        Feature.REFUND_PAYMENTS,
        Feature.VIEW_REPORTS,
        Feature.EXPORT_REPORTS,
        Feature.ADVANCED_ANALYTICS,
        Feature.USE_CASHREGISTER,
        Feature.OPEN_REGISTER,
        Feature.CLOSE_REGISTER,
        Feature.VIEW_TEAM,
        Feature.MANAGE_TEAM_USERS,
        Feature.INVITE_USERS,
    },
}

# Role-based permissions
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "viewer": {"view"},
    "manager": {"view", "edit", "create"},
    "admin": {"view", "edit", "create", "delete", "manage"},
}


def get_available_features(plan: str, role: str = "viewer") -> List[str]:
    """
    Obtiene la lista de features disponibles para un plan y rol específicos
    
    Args:
        plan: Plan del usuario (free, basic, plus, start, max, admin)
        role: Rol del usuario (viewer, manager, admin)
    
    Returns:
        Lista de features disponibles
    """
    features = PLAN_FEATURES.get(plan, set())
    return [f.value for f in features]


def has_feature(plan: str, feature: Feature, role: str = "viewer") -> bool:
    """
    Verifica si un usuario con cierto plan y rol tiene acceso a una feature
    
    Args:
        plan: Plan del usuario
        feature: Feature a verificar
        role: Rol del usuario
    
    Returns:
        True si tiene acceso, False en caso contrario
    """
    if plan == "admin" or role == "admin":
        return True
    
    features = PLAN_FEATURES.get(plan, set())
    return feature in features


def get_plan_limits(plan: str) -> Dict[str, int]:
    """
    Obtiene los límites de recursos según el plan
    
    Args:
        plan: Plan del usuario
    
    Returns:
        Diccionario con límites
    """
    limits = {
        "free": {
            # Free is very limited - demo mode only
            "team_members": 1,
            "customers": 10,
            "appointments": 20,
            "reports": 0,  # No reports
            "storage_gb": 0,
            "services": 5,
        },
        "basic": {
            "team_members": 1,
            "customers": 500,
            "appointments": 500,
            "reports": 10,
            "storage_gb": 5,
            "services": 50,
        },
        "AdminG_Basic": {
            "team_members": 1,
            "customers": 500,
            "appointments": 500,
            "reports": 10,
            "storage_gb": 5,
            "services": 50,
        },
        "AdminG_Plus": {
            "team_members": 3,
            "customers": 2000,
            "appointments": 2000,
            "reports": 50,
            "storage_gb": 25,
            "services": 200,
        },
        "plus": {
            "team_members": 5,
            "customers": 2000,
            "appointments": 5000,
            "reports": 100,
            "storage_gb": 50,
        },
        "start": {
            "team_members": 10,
            "customers": 10000,
            "appointments": 50000,
            "reports": 500,
            "storage_gb": 200,
        },
        "max": {
            "team_members": 50,
            "customers": 999999,
            "appointments": 999999,
            "reports": 999999,
            "storage_gb": 1000,
        },
        "admin": {
            "team_members": 999999,
            "customers": 999999,
            "appointments": 999999,
            "reports": 999999,
            "storage_gb": 10000,
        },
    }
    return limits.get(plan, limits["free"])
