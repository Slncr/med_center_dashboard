from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Medical Center Dashboard"
    VERSION: str = "1.0.0"

    # CORS: в docker-compose — строка через запятую, не JSON
    BACKEND_CORS_ORIGINS: str = ""

    DATABASE_URL: str = "postgresql://med_user:med_pass@postgres:5432/med_center"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40

    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/2"

    SECRET_KEY: str = "Gp6qPUYuc6LKlCvGwOuDGLQhXx4jDNqkjugTOUfKdFG"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 240

    ONEC_BASE_URL: Optional[str] = None
    ONEC_USER: Optional[str] = None
    ONEC_PASSWORD: Optional[str] = None
    ONEC_TIMEOUT: int = 30

    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    ALLOW_PUBLIC_ROOM_DISPLAY: bool = True

    MONITORING_API_URL: str = "http://172.191.7.50/api"
    MONITORING_API_TIMEOUT: int = 5

    # Оповещения по браслетам → MAX
    BRACELET_ALERTS_ENABLED: bool = True
    BRACELET_ALERT_CHECK_INTERVAL_SEC: int = 60
    BRACELET_ALERT_COOLDOWN_SEC: int = 900
    MAX_BOT_TOKEN: Optional[str] = None
    MAX_ALERT_CHAT_ID: Optional[int] = None
    MAX_API_BASE_URL: str = "https://platform-api.max.ru"
    MAX_API_TIMEOUT: int = 10

    @field_validator("MAX_BOT_TOKEN", mode="before")
    @classmethod
    def empty_str_to_none(cls, value: object) -> object:
        if value == "" or value is None:
            return None
        return value

    @field_validator("MAX_ALERT_CHAT_ID", mode="before")
    @classmethod
    def empty_chat_id_to_none(cls, value: object) -> object:
        if value == "" or value is None:
            return None
        return value

    def cors_origins_list(self) -> List[str]:
        if self.BACKEND_CORS_ORIGINS.strip():
            return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://frontend:3000",
        ]


settings = Settings()
