from app.core.security import hash_password, verify_password

_fake_users_db = {}

def create_user(email: str, password: str, role: str):
    _fake_users_db[email] = {
        "email": email,
        "password": hash_password(password),
        "role": role
    }
    return _fake_users_db[email]

def authenticate_user(email: str, password: str):
    user = _fake_users_db.get(email)
    if not user:
        return False
    if not verify_password(password, user["password"]):
        return False
    return user
