from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from app.models.team_user import TeamUser
from app.models.user import User


LEGACY_PLAN_MAP = {
    "basic": "starter",
    "AdminG_Basic": "starter",
    "plus": "pro",
    "AdminG_Plus": "pro",
    "start": "pro",
    "AdminPro_Start": "pro",
    "AdminPro_Max": "max",
}


def normalize_plan(plan: str | None) -> str:
    if not plan:
        return "free"
    return LEGACY_PLAN_MAP.get(plan, plan)


def resolve_collaboration_owner_id(
    user: User,
    db: Session,
    *,
    allow_external: bool,
    allowed_owner_plans: Iterable[str] | None = None,
) -> int:
    """Resolve the owner context for a user, optionally including active external team membership."""
    owner_id = user.parent_user_id if user.parent_user_id else user.id
    if user.parent_user_id or not allow_external:
        return owner_id

    active_membership = (
        db.query(TeamUser)
        .filter(
            TeamUser.member_user_id == user.id,
            TeamUser.is_active.is_(True),
            TeamUser.status == "active",
        )
        .order_by(TeamUser.id.desc())
        .first()
    )
    if not active_membership:
        return owner_id

    owner = db.query(User).filter(User.id == active_membership.team_owner_id, User.is_active.is_(True)).first()
    if not owner:
        return owner_id

    if owner.role == "admin":
        return owner.id

    if allowed_owner_plans is None:
        return owner.id

    if normalize_plan(owner.plan) in set(allowed_owner_plans):
        return owner.id

    return owner_id


def get_scope_user_ids(owner_id: int, db: Session) -> list[int]:
    child_ids = [uid for (uid,) in db.query(User.id).filter(User.parent_user_id == owner_id).all()]
    return [owner_id, *child_ids]
