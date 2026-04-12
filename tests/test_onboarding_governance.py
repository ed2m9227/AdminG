from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User
from app.modules.eoe.router import router as eoe_router
from app.modules.onboarding.router import router as onboarding_router


def _build_client(tmp_path: Path):
    db_file = tmp_path / "test_onboarding_governance.db"
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    app = FastAPI()
    app.include_router(onboarding_router)
    app.include_router(eoe_router)

    def override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app), SessionLocal, engine


def _seed_user(session_local):
    db = session_local()
    try:
        user = User(
            email="gov.user@example.com",
            hashed_password="unused",
            role="manager",
            plan="max",
            onboarding_completed=False,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id
    finally:
        db.close()


def _auth_headers(user_id: int):
    token = create_access_token({"sub": str(user_id), "role": "manager", "plan": "max"})
    return {"Authorization": f"Bearer {token}"}


def test_onboarding_governance_consent_and_completion(tmp_path):
    client, session_local, engine = _build_client(tmp_path)
    user_id = _seed_user(session_local)
    headers = _auth_headers(user_id)

    init_resp = client.post(
        "/onboarding/initialize",
        headers=headers,
        json={
            "governance_mode": "comunitario",
            "operation_level": "operativo",
            "primary_objective": "seguimiento_ciudadano",
            "entity_name": "JAC Barrio Norte",
            "jurisdiction_code": "CO",
            "territory_code": "CO-ATL-BQ",
            "role": "manager",
        },
    )
    assert init_resp.status_code == 200
    assert init_resp.json()["success"] is True
    assert "required_consents" in init_resp.json()

    consent_resp = client.post(
        "/onboarding/consents",
        headers=headers,
        json={
            "items": [
                {"code": "terms_use", "accepted": True},
                {"code": "privacy_base", "accepted": True},
            ]
        },
    )
    assert consent_resp.status_code == 200

    complete_resp = client.post("/onboarding/complete", headers=headers)
    assert complete_resp.status_code == 200
    assert complete_resp.json()["onboarding_completed"] is True

    status_resp = client.get("/onboarding/consents/status", headers=headers)
    assert status_resp.status_code == 200
    status_map = {row["code"]: row["active"] for row in status_resp.json()["items"]}
    assert status_map.get("terms_use") is True
    assert status_map.get("privacy_base") is True

    # OmniRisk endpoint must be blocked without contextual AI scoring consent.
    risk_blocked = client.post("/risk/evaluate", headers=headers, json={"context": {"x": 1}})
    assert risk_blocked.status_code == 403

    ai_consent = client.post(
        "/onboarding/consents",
        headers=headers,
        json={"items": [{"code": "ai_automated_scoring", "accepted": True}]},
    )
    assert ai_consent.status_code == 200

    risk_allowed = client.post("/risk/evaluate", headers=headers, json={"context": {"x": 1}})
    assert risk_allowed.status_code == 200

    engine.dispose()
