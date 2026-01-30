from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Bed(BaseModel):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String, nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    is_occupied = Column(Boolean, default=False)
    external_id = Column(String, unique=True, index=True)

    # ❗️Используйте строковое имя модели
    patients = relationship("Patient", back_populates="bed")
