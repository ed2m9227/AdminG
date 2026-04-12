from sqlalchemy import text

from tests.conftest import (
    auth_headers,
    create_customer_record,
    create_payment_record,
    create_team_membership,
    create_user,
)


def test_customer_sensitive_fields_are_encrypted_at_rest(db_session):
    owner = create_user(db_session, email="owner1@example.com")
    customer = create_customer_record(
        db_session,
        owner=owner,
        phone="3001234567",
        notes="Paciente con alergia severa",
    )

    row = db_session.execute(
        text("SELECT phone, notes FROM customers WHERE id = :customer_id"),
        {"customer_id": customer.id},
    ).fetchone()

    assert row[0] != "3001234567"
    assert row[1] != "Paciente con alergia severa"
    assert str(row[0]).startswith("enc::")
    assert str(row[1]).startswith("enc::")

    refreshed = db_session.query(type(customer)).filter_by(id=customer.id).first()
    assert refreshed.phone == "3001234567"
    assert refreshed.notes == "Paciente con alergia severa"


def test_child_user_can_read_owner_customer_but_other_tenant_cannot(client, db_session):
    owner = create_user(db_session, email="owner-main@example.com", plan="max")
    child = create_user(db_session, email="child@example.com", plan="starter", parent_user_id=owner.id)
    outsider = create_user(db_session, email="outsider@example.com", plan="max")
    customer = create_customer_record(db_session, owner=owner, full_name="Cliente Compartido")

    child_response = client.get(f"/customers/{customer.id}", headers=auth_headers(child))
    outsider_response = client.get(f"/customers/{customer.id}", headers=auth_headers(outsider))

    assert child_response.status_code == 200
    assert child_response.json()["full_name"] == "Cliente Compartido"
    assert outsider_response.status_code == 404


def test_external_member_can_inherit_scope_from_max_owner(client, db_session):
    max_owner = create_user(db_session, email="max-owner@example.com", plan="max")
    external_member = create_user(db_session, email="external-max@example.com", plan="starter")
    max_customer = create_customer_record(db_session, owner=max_owner, full_name="Cliente Max")

    create_team_membership(db_session, owner=max_owner, member=external_member)

    response = client.get(f"/customers/{max_customer.id}", headers=auth_headers(external_member))

    assert response.status_code == 200
    assert response.json()["full_name"] == "Cliente Max"


def test_external_member_does_not_inherit_scope_from_starter_owner(client, db_session):
    starter_owner = create_user(db_session, email="starter-owner@example.com", plan="starter")
    external_member = create_user(db_session, email="external-starter@example.com", plan="starter")
    starter_customer = create_customer_record(db_session, owner=starter_owner, full_name="Cliente Starter")

    create_team_membership(db_session, owner=starter_owner, member=external_member)

    response = client.get(f"/customers/{starter_customer.id}", headers=auth_headers(external_member))

    assert response.status_code == 404


def test_child_user_cannot_delete_payment_from_parent_scope(client, db_session):
    owner = create_user(db_session, email="pay-owner@example.com", plan="max")
    child = create_user(db_session, email="pay-child@example.com", plan="starter", parent_user_id=owner.id)
    customer = create_customer_record(db_session, owner=owner, full_name="Cliente Pago")
    payment = create_payment_record(db_session, owner=owner, customer=customer, notes="Pago sensible", reference="REF-7788")

    response = client.delete(f"/payments/{payment.id}", headers=auth_headers(child))

    assert response.status_code == 403
    assert db_session.execute(text("SELECT COUNT(*) FROM payments WHERE id = :payment_id"), {"payment_id": payment.id}).scalar() == 1