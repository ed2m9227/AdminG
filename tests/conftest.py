from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.team_user import TeamUser
from app.models.user import User
from app.modules.customers.router import router as customers_router
from app.modules.payments.router import router as payments_router


@pytest.fixture()
def db_engine(tmp_path: Path):
    db_file = tmp_path / "test_entrega_c.db"
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def session_factory(db_engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=db_engine)


@pytest.fixture()
def db_session(session_factory):
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(session_factory):
    app = FastAPI()
    app.include_router(customers_router)
    app.include_router(payments_router)

    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def create_user(db_session, *, email: str, role: str = "manager", plan: str = "max", parent_user_id=None):
    user = User(
        email=email,
        hashed_password="not_used_in_test",
        role=role,
        plan=plan,
        parent_user_id=parent_user_id,
        is_active=True,
        onboarding_completed=True,
        plan_paid=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id), "role": user.role, "plan": user.plan})
    return {"Authorization": f"Bearer {token}"}


def create_customer_record(db_session, *, owner: User, full_name: str = "Cliente Uno", phone: str | None = None, notes: str | None = None):
    customer = Customer(user_id=owner.id, full_name=full_name, phone=phone, notes=notes, email=None)
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer


def create_payment_record(db_session, *, owner: User, customer: Customer, notes: str | None = None, reference: str | None = None):
    payment = Payment(
        user_id=owner.id,
        customer_id=customer.id,
        amount=100,
        discount_amount=0,
        final_amount=100,
        method="cash",
        status="completed",
        notes=notes,
        reference=reference,
    )
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)
    return payment


def create_team_membership(db_session, *, owner: User, member: User, role_in_team: str = "viewer"):
    membership = TeamUser(
        team_owner_id=owner.id,
        member_user_id=member.id,
        role_in_team=role_in_team,
        status="active",
        is_active=True,
    )
    db_session.add(membership)
    db_session.commit()
    db_session.refresh(membership)
    return membership