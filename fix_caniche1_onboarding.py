from app.db.session import SessionLocal
from app.models.user import User

db = SessionLocal()

# Marcar caniche1 como onboarding completado
user = db.query(User).filter(User.email == 'caniche1@example.com').first()

if user:
    print('\n=== Actualizando caniche1 ===')
    print(f'Antes: onboarding_completed={user.onboarding_completed}')
    
    user.onboarding_completed = True
    db.commit()
    db.refresh(user)
    
    print(f'Después: onboarding_completed={user.onboarding_completed}')
    print('\n✅ Usuario caniche1 actualizado correctamente')
else:
    print('❌ Usuario caniche1 no encontrado')

db.close()
