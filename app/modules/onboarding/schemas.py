from pydantic import BaseModel, Field


class OnboardingInitializePayload(BaseModel):
    governance_mode: str = Field(min_length=3, max_length=40)
    role: str | None = None
    operation_level: str = Field(min_length=3, max_length=40)
    primary_objective: str = Field(min_length=3, max_length=80)
    entity_name: str = Field(min_length=2, max_length=180)
    jurisdiction_code: str | None = Field(default="CO", max_length=20)
    territory_code: str | None = Field(default=None, max_length=60)


class ConsentUpdatePayload(BaseModel):
    code: str
    accepted: bool


class ConsentBatchPayload(BaseModel):
    items: list[ConsentUpdatePayload]


class KeyRotationLogPayload(BaseModel):
    reason: str | None = None
    key_name: str = "FIELD_ENCRYPTION_KEY"
    key_version: str | None = None
