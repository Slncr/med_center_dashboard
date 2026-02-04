from pydantic_settings import BaseSettings
from typing import List, Optional
from pydantic import AnyHttpUrl, validator


class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Medical Center Dashboard"
    VERSION: str = "1.0.0"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str] | str:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Database
    DATABASE_URL: str = "postgresql://med_user:med_pass@postgres:5432/med_center"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Security
    SECRET_KEY: str = "Gp6qPUYuc6LKlCvGwOuDGLQhXx4jDNqkjugTOUfKdFG"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 1C
    ONEC_BASE_URL: Optional[str] = None
    ONEC_USER: Optional[str] = None
    ONEC_PASSWORD: Optional[str] = None
    ONEC_TIMEOUT: int = 30
    
    # Application
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()