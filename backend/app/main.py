from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1.api import api_router
from app.core.database import engine
from app.models.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan контекст для управления событиями запуска/остановки приложения.
    """
    print("🚀 Starting up...")
    
    # Создаем таблицы в базе данных (только для разработки!)
    # В production используйте Alembic миграции
    if settings.ENVIRONMENT == "development":
        Base.metadata.create_all(bind=engine)
    
    yield
    
    print("👋 Shutting down...")


# Создаем приложение FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

_cors_origins = settings.cors_origins_list()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем API роутер
app.include_router(api_router, prefix=settings.API_V1_STR)

# # Статические файлы
# app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/")
async def root():
    """
    Корневой endpoint для проверки работы API.
    """
    return {
        "message": "Medical Center Dashboard API",
        "version": settings.VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint для мониторинга.
    """
    return {"status": "healthy", "timestamp": "isoformat"}