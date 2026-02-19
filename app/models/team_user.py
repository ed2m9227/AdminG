"""
Team User Model - Para gestión de usuarios dentro de teams/equipos
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base


class TeamUser(Base):
    """Modelo para usuarios dentro de un equipo (team)"""
    __tablename__ = "team_users"

    id = Column(Integer, primary_key=True, index=True)
    
    # Este es el usuario maestro que invita/gestiona
    team_owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Este es el usuario miembro del equipo
    member_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Rol del miembro en el equipo (puede ser diferente al rol global del usuario)
    role_in_team = Column(String(30), default="viewer", nullable=False)  # viewer, manager, admin
    
    # Status (active, invited, suspended)
    status = Column(String(30), default="active", nullable=False)
    
    # Permisos específicos (JSON como string, para ser flexible)
    permissions = Column(String(500), default="", nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    invited_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    joined_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    team_owner = relationship(
        "User",
        foreign_keys=[team_owner_id],
        backref="owned_teams"
    )
    member = relationship(
        "User",
        foreign_keys=[member_user_id],
        backref="team_memberships"
    )
