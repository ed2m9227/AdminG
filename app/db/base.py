from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import models so metadata is populated for create_all
from app import models  # noqa: F401
