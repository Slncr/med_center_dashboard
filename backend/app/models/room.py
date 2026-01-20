from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship

from .base import BaseModel


class Room(BaseModel):
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    description = Column(Text)
    max_beds = Column(Integer, default=1)
    floor = Column(Integer)
    wing = Column(String)
    
    # Relationships
    beds = relationship("Bed", back_populates="room", cascade="all, delete-orphan")

class Bed(BaseModel):
    tablename = "beds"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    is_occupied = Column(Boolean, default=False)
    external_id = Column(String)  # ID из 1С

    # Relationships
    room = relationship("Room", back_populates="beds")
    patients = relationship("Patient", back_populates="bed", uselist=False)