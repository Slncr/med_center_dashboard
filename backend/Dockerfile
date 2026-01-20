FROM python:3.11-slim

WORKDIR /app

# Устанавливаем системные зависимости с исправлением репозиториев
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Обновляем репозитории и устанавливаем зависимости
RUN echo "deb http://deb.debian.org/debian bookworm main" > /etc/apt/sources.list && \
    echo "deb http://deb.debian.org/debian bookworm-updates main" >> /etc/apt/sources.list && \
    echo "deb http://security.debian.org/debian-security bookworm-security main" >> /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    postgresql-client \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements
COPY requirements.txt .

# Устанавливаем Python зависимости с использованием зеркала в России (если нужно)
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.org/simple/

# Копируем приложение
COPY . .

# Создаем не-root пользователя
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Запускаем приложение
CMD ["sh", "-c", "sleep 3 && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]