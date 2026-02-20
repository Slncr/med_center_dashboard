from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services.mit_service import sync_with_1c
from app.core.database import get_db

router = APIRouter(prefix="/1c", tags=["Integration"])

@router.post("/sync")
def sync_with_1c_endpoint(db: Session = Depends(get_db)):
    result = sync_with_1c(db)
    return result