#!/usr/bin/env python
"""Fix pending cash register sessions"""

from app.db.session import SessionLocal
from app.models.cash_register_session import CashRegisterSession
from datetime import datetime

db = SessionLocal()

try:
    # Find and close all active sessions
    active_sessions = db.query(CashRegisterSession).filter(
        CashRegisterSession.is_active == True
    ).all()
    
    print(f'📊 Sesiones abiertas encontradas: {len(active_sessions)}')
    
    for session in active_sessions:
        print(f'  - Usuario ID: {session.user_id}, Abierta desde: {session.opened_at}')
        session.is_active = False
        session.closed_at = datetime.utcnow()
        db.add(session)
    
    if active_sessions:
        db.commit()
        print('✓ Todas las sesiones han sido cerradas')
    else:
        print('✓ No hay sesiones pendientes')
        
finally:
    db.close()
