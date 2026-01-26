from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_users():
    return [{"id": 1, "username": "admin", "role": "admin"}]