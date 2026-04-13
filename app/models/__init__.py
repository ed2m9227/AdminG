from app.models.user import User
from app.models.customer import Customer
from app.models.pet import Pet
from app.models.business_config import BusinessConfiguration
from app.models.service import Service
from app.models.appointment import Appointment
from app.models.payment import Payment
from app.models.payment_item import PaymentItem
from app.models.plan import Plan, PlanLimit, PlanFeature
from app.models.inventory import InventoryItem, InventoryCategory, InventoryMovement
from app.models.inventory_package import InventoryPackage, InventoryPackageItem
from app.models.team_user import TeamUser
from app.models.cash_transaction import CashTransaction
from app.models.document import Document
from app.models.authorization import Authorization
from app.models.invoice import Invoice, InvoiceItem
from app.models.tax_config import TaxConfig
from app.models.service_package import ServicePackage, ServicePackageItem
from app.models.notification import Notification
from app.models.audit_log import AuditLog, VoidRequest
from app.models.refresh_token import RefreshToken
from app.models.governance import (
    GovernanceEntity,
    PolicyVersion,
    ConsentType,
    UserConsent,
    TrialPolicy,
    UserTrial,
    KeyRotationEvent,
)
from app.models.crm import Consultation, Treatment, Vaccine, MedicalRecord

# Optional domain modules: avoid startup crashes if a deployment branch does not include them yet.
try:
    from app.models.payroll_payment import PayrollPayment
except ModuleNotFoundError:
    PayrollPayment = None

try:
    from app.models.operations import (
        OperationalUnitType,
        OperationalUnit,
        OperationalContext,
        OperationalEvent,
        RiskRegistry,
        RiskAssessment,
        Incident,
        ActionPlan,
        Expense,
    )
except ModuleNotFoundError:
    OperationalUnitType = None
    OperationalUnit = None
    OperationalContext = None
    OperationalEvent = None
    RiskRegistry = None
    RiskAssessment = None
    Incident = None
    ActionPlan = None
    Expense = None

__all__ = [
    "User",
    "Customer",
    "Pet",
    "BusinessConfiguration",
    "Service",
    "Appointment",
    "Payment",
    "PaymentItem",
    "Plan",
    "PlanLimit",
    "PlanFeature",
    "InventoryItem",
    "InventoryCategory",
    "InventoryMovement",
    "TeamUser",
    "CashTransaction",
    "Document",
    "Authorization",
    "Invoice",
    "InvoiceItem",
    "TaxConfig",
    "ServicePackage",
    "ServicePackageItem",
    "Notification",
    "AuditLog",
    "VoidRequest",
    "RefreshToken",
    "GovernanceEntity",
    "PolicyVersion",
    "ConsentType",
    "UserConsent",
    "TrialPolicy",
    "UserTrial",
    "KeyRotationEvent",
    "Consultation",
    "Treatment",
    "Vaccine",
    "MedicalRecord",
]

if PayrollPayment is not None:
    __all__.append("PayrollPayment")

if OperationalUnitType is not None:
    __all__.extend([
        "OperationalUnitType",
        "OperationalUnit",
        "OperationalContext",
        "OperationalEvent",
        "RiskRegistry",
        "RiskAssessment",
        "Incident",
        "ActionPlan",
        "Expense",
    ])
