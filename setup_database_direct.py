#!/usr/bin/env python
"""
Script to create all database tables without alembic
Useful when alembic migrations are broken
"""
from app.db.base import Base
from app.db.session import engine
from app.models import (
    User, Customer, Pet, BusinessConfiguration,
    Service, Appointment, Payment, Plan, PlanLimit, PlanFeature,
    InventoryItem, InventoryCategory, InventoryMovement, TeamUser
)
from app.models.business_types import BusinessType
from app.modules.plans.service import seed_plans
from sqlalchemy.orm import Session

def create_tables():
    """Create all tables"""
    print("📊 Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created successfully!")

def seed_initial_data():
    """Seed initial data"""
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        # Seed plans
        print("📋 Seeding plans...")
        session = Session(bind=engine)
        seed_plans(session)
        print("✅ Plans seeded!")
        
        print("\n✅ Database setup complete!")
        print("\nCreated tables:")
        print("  - users")
        print("  - customers")
        print("  - pets")
        print("  - business_configurations")
        print("  - services")
        print("  - appointments")
        print("  - payments")
        print("  - plans, plan_limits, plan_features")
        print("  - inventory_items, inventory_categories, inventory_movements")
        print("  - team_users")
        
    finally:
        db.close()

if __name__ == "__main__":
    create_tables()
    seed_initial_data()
