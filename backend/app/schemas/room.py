from pydantic import BaseModel
from typing import List, Optional, Union
from .patient import Patient

class Bed(BaseModel):
    id: int
    number: Union[str, int]
    patient: Optional[Patient] = None

class Room(BaseModel):
    id: int
    number: str
    beds: List[Bed]