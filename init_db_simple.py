#!/usr/bin/env python
"""Restore database without Alembic"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json

# Create engine
engine = create_engine('sqlite:///./app.db', connect_args={"check_same_thread": False})
Base = declarative_base()

# Define models inline to avoid import issues
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    role = Column(String(50), default='user')
    plan = Column(String(50), default='free')
    created_at = Column(DateTime, default=datetime.utcnow)

class Customer(Base):
    __tablename__ = 'customers'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)

class Pet(Base):
    __tablename__ = 'pets'
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False)
    name = Column(String(255), nullable=False)
    animal_type = Column(String(50))
    breed = Column(String(100))
    color = Column(String(100))
    weight = Column(Float)
    gender = Column(String(20))
    date_of_birth = Column(DateTime)
    microchip = Column(String(100), unique=True)
    neutered = Column(Boolean)
    allergies = Column(Text)
    medications = Column(Text)
    last_checkup = Column(DateTime)
    vaccinations = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class BusinessConfiguration(Base):
    __tablename__ = 'business_configurations'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    business_type = Column(String(50), default='OTRO')
    business_name = Column(String(255))
    business_description = Column(Text)
    customer_label = Column(String(50), default='Cliente')
    pet_label = Column(String(50), default='Mascota')
    appointment_label = Column(String(50), default='Cita')
    pet_fields_enabled = Column(JSON, default=dict)
    has_pet_relationship = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Service(Base):
    __tablename__ = 'services'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class Appointment(Base):
    __tablename__ = 'appointments'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False)
    service_id = Column(Integer, ForeignKey('services.id'))
    appointment_date = Column(DateTime, nullable=False)
    status = Column(String(50), default='scheduled')
    notes = Column(Text)
    price = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class Payment(Base):
    __tablename__ = 'payments'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False)
    appointment_id = Column(Integer, ForeignKey('appointments.id'))
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50))
    status = Column(String(50), default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)

class Plan(Base):
    __tablename__ = 'plans'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True)
    price = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class PlanLimit(Base):
    __tablename__ = 'plan_limits'
    id = Column(Integer, primary_key=True)
    plan_id = Column(Integer, ForeignKey('plans.id'), nullable=False)
    feature_name = Column(String(100))
    limit_value = Column(Integer)

class PlanFeature(Base):
    __tablename__ = 'plan_features'
    id = Column(Integer, primary_key=True)
    plan_id = Column(Integer, ForeignKey('plans.id'), nullable=False)
    feature_name = Column(String(100))

class InventoryItem(Base):
    __tablename__ = 'inventory_items'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    category_id = Column(Integer, ForeignKey('inventory_categories.id'))
    name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=0)
    unit_price = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class InventoryCategory(Base):
    __tablename__ = 'inventory_categories'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(100))

class InventoryMovement(Base):
    __tablename__ = 'inventory_movements'
    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey('inventory_items.id'), nullable=False)
    movement_type = Column(String(50))
    quantity = Column(Integer)

class TeamUser(Base):
    __tablename__ = 'team_users'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    team_member_id = Column(Integer, ForeignKey('users.id'), nullable=False)

# Create all tables
print("📊 Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✅ All tables created!")
print("\nTables created:")
for table_name in Base.metadata.tables.keys():
    print(f"  - {table_name}")

# Create session and add admin user
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Check if admin already exists
    admin = db.query(User).filter(User.email == 'admin@admingpro.com').first()
    if not admin:
        from app.core.security import hash_password
        admin = User(
            username='admin',
            email='admin@admingpro.com',
            hashed_password=hash_password('adminpass123'),
            full_name='Admin User',
            role='admin',
            plan='max'
        )
        db.add(admin)
        db.commit()
        print("\n✅ Admin user created!")
    else:
        print("\n✅ Admin user already exists")
        
except Exception as e:
    print(f"⚠️  Warning creating admin: {e}")
finally:
    db.close()

print("\n✅ Database initialization complete!")
