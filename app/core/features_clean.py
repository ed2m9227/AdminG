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
    
    # Documents & Authorization
    VIEW_DOCUMENTS = "view_documents"
    CREATE_DOCUMENTS = "create_documents"
    EDIT_DOCUMENTS = "edit_documents"
    DELETE_DOCUMENTS = "delete_documents"
    VIEW_AUTHORIZATIONS = "view_authorizations"
    CREATE_AUTHORIZATIONS = "create_authorizations"
    MANAGE_AUTHORIZATIONS = "manage_authorizations"
    
    # Admin (Master only)
    ADMIN_PANEL = "admin_panel"
    MANAGE_ALL_USERS = "manage_all_users"
    VIEW_SYSTEM_STATS = "view_system_stats"
    MANAGE_PLANS = "manage_plans"
    VIEW_BILLING = "view_billing"


# Plan Features Mapping
PLAN_FEATURES: Dict[str, Set[Feature]] = {
    "free": {
        Feature.VIEW_CUSTOMERS,
        Feature.VIEW_APPOINTMENTS,
    },
    "starter": {
        # Customers (Información del paciente)
        Feature.VIEW_CUSTOMERS,
        Feature.CREATE_CUSTOMERS,
        Feature.EDIT_CUSTOMERS,
        Feature.DELETE_CUSTOMERS,
        # Appointments (Procedimientos/Citas)
        Feature.VIEW_APPOINTMENTS,
        Feature.CREATE_APPOINTMENTS,
        Feature.EDIT_APPOINTMENTS,
        Feature.DELETE_APPOINTMENTS,
        # Inventory (Almacén de medicinas/productos)
        Feature.VIEW_INVENTORY,
        Feature.CREATE_PRODUCTS,
        Feature.EDIT_PRODUCTS,
        Feature.DELETE_PRODUCTS,
        # Payments (Contabilidad/Facturación)
        Feature.VIEW_PAYMENTS,
        Feature.CREATE_PAYMENTS,
        # Reports
        Feature.VIEW_REPORTS,
        # Documents (Documentos de responsabilidad, consentimiento, etc)
        Feature.VIEW_DOCUMENTS,
        Feature.CREATE_DOCUMENTS,
        Feature.EDIT_DOCUMENTS,
        # Authorizations (Autorizaciones médicas)
        Feature.VIEW_AUTHORIZATIONS,
        Feature.CREATE_AUTHORIZATIONS,
    },
    "pro": {
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
        Feature.USE_CASHREGISTER,
        Feature.OPEN_REGISTER,
        Feature.CLOSE_REGISTER,
        Feature.VIEW_TEAM,
        Feature.MANAGE_TEAM_USERS,
        Feature.INVITE_USERS,
    },
    "max": {
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
        # Documents & Authorizations
        Feature.VIEW_DOCUMENTS,
        Feature.CREATE_DOCUMENTS,
        Feature.EDIT_DOCUMENTS,
        Feature.DELETE_DOCUMENTS,
        Feature.VIEW_AUTHORIZATIONS,
        Feature.CREATE_AUTHORIZATIONS,
        Feature.MANAGE_AUTHORIZATIONS,
        Feature.ADMIN_PANEL,
    },
    "admin": {
        Feature.ADMIN_PANEL,
        Feature.MANAGE_ALL_USERS,
        Feature.VIEW_SYSTEM_STATS,
        Feature.MANAGE_PLANS,
        Feature.VIEW_BILLING,
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
        Feature.VIEW_DOCUMENTS,
        Feature.CREATE_DOCUMENTS,
        Feature.EDIT_DOCUMENTS,
        Feature.DELETE_DOCUMENTS,
        Feature.VIEW_AUTHORIZATIONS,
        Feature.CREATE_AUTHORIZATIONS,
        Feature.MANAGE_AUTHORIZATIONS,
    },
    # Legacy plan aliases (backward compatibility)
    "basic": set(),
    "plus": set(),
    "start": set(),
    "AdminG_Basic": set(),
    "AdminG_Plus": set(),
    "AdminPro_Start": set(),
    "AdminPro_Max": set(),
}

# Legacy plan aliases
PLAN_FEATURES["basic"] = PLAN_FEATURES["starter"]
PLAN_FEATURES["AdminG_Basic"] = PLAN_FEATURES["starter"]
PLAN_FEATURES["plus"] = PLAN_FEATURES["pro"]
PLAN_FEATURES["AdminG_Plus"] = PLAN_FEATURES["pro"]
PLAN_FEATURES["start"] = PLAN_FEATURES["pro"]
PLAN_FEATURES["AdminPro_Start"] = PLAN_FEATURES["pro"]
PLAN_FEATURES["AdminPro_Max"] = PLAN_FEATURES["max"]

# Role-based permissions
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "team": {"view"},
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
            "team_members": 1,
            "customers": 50,
            "appointments": 100,
            "reports": 0,
            "storage_gb": 1,
            "services": 0,
        },
        "starter": {
            "team_members": 5,
            "customers": 500,
            "appointments": 1000,
            "reports": 10,
            "storage_gb": 5,
            "services": 200,
            "documents": 500,
            "authorizations": 500,
        },
        "pro": {
            "team_members": 25,
            "customers": 999999,
            "appointments": 999999,
            "reports": 200,
            "storage_gb": 50,
            "services": 200,
            "documents": 5000,
            "authorizations": 5000,
        },
        "max": {
            "team_members": 100,
            "customers": 999999,
            "appointments": 999999,
            "reports": 999999,
            "storage_gb": 200,
            "services": 1000,
            "documents": 50000,
            "authorizations": 50000,
        },
        "admin": {
            "team_members": 999999,
            "customers": 999999,
            "appointments": 999999,
            "reports": 999999,
            "storage_gb": 10000,
            "services": 999999,
            "documents": 999999,
            "authorizations": 999999,
        },
        "basic": {},
        "plus": {},
        "start": {},
        "AdminG_Basic": {},
        "AdminG_Plus": {},
        "AdminPro_Start": {},
        "AdminPro_Max": {},
    }

    limits["basic"] = limits["starter"]
    limits["AdminG_Basic"] = limits["starter"]
    limits["plus"] = limits["pro"]
    limits["AdminG_Plus"] = limits["pro"]
    limits["start"] = limits["pro"]
    limits["AdminPro_Start"] = limits["pro"]
    limits["AdminPro_Max"] = limits["max"]
    return limits.get(plan, limits["free"])
