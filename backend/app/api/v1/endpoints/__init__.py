from .auth import router as auth_router
from .patients import router as patients_router
from .rooms import router as rooms_router
from .medical import router as medical_router

__all__ = ["auth_router", "patients_router", "rooms_router", "medical_router"]
