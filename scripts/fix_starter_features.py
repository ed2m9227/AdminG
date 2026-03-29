"""Add missing features to starter plan in existing database."""
from app.db.session import SessionLocal
from app.models.plan import Plan, PlanFeature

missing = [
    ('cashregister', 'Caja registradora'),
    ('team', 'Mi equipo'),
]
# features to remove if erroneously present
remove_features = ['basic_reports']


def run():
    db = SessionLocal()
    plan = db.query(Plan).filter(Plan.name == 'starter').first()
    if not plan:
        print('Starter plan not found, aborting')
        return

    for code,name in missing:
        existing = db.query(PlanFeature).filter(PlanFeature.plan_id == plan.id, PlanFeature.feature_code == code).first()
        if existing:
            print(f'{code} already exists')
        else:
            pf = PlanFeature(plan_id=plan.id, feature_code=code, feature_name=name, is_enabled=True)
            db.add(pf)
            print(f'Added feature {code}')
    # remove unwanted features if they exist
    for code in remove_features:
        existing = db.query(PlanFeature).filter(PlanFeature.plan_id == plan.id, PlanFeature.feature_code == code).first()
        if existing:
            db.delete(existing)
            print(f'Removed feature {code}')
    db.commit()
    db.close()

if __name__ == '__main__':
    run()