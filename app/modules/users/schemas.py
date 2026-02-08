from pydantic import BaseModel

class UserCreate(BaseModel):
    email: str
    password: str
    role: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    email: str
    role: str