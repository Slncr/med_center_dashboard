from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .base import BaseModel


class Room(BaseModel):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String, nullable=False)
    name = Column(String)
    description = Column(String)
    max_beds = Column(Integer, default=10)
    floor = Column(Integer)
    wing = Column(String)
    external_id = Column(String, unique=True, index=True)  # UUID из 1С
