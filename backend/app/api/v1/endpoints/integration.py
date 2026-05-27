from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.mit_service import sync_with_1c
from app.core.database import get_db
from app.deps import get_current_user
from app.models.user import User, UserRole

router = APIRouter(prefix="/1c", tags=["Integration"])


@router.post("/sync")
def sync_with_1c_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.ADMIN, UserRole.NURSE):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = sync_with_1c(db)
    return result


@router.get("/patients")
def get_patients_from_1c_stub(current_user: User = Depends(get_current_user)):
    """Заглушка: список пациентов из 1С через HTTP sync, не отдельный endpoint."""
    return {"message": "Use POST /integration/1c/sync to import patients from 1C", "patients": []}