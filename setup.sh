#!/bin/bash
set -e

echo "🚀 Настройка проекта Medical Center Dashboard"

# Бэкенд
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

echo "📦 Устанавливаем Python зависимости..."
pip install --upgrade pip
pip install -r requirements.txt

echo "🗄️ Создаем миграции..."
if [ -f "alembic.ini" ]; then
    alembic revision --autogenerate -m "Initial migration" || true
    alembic upgrade head || true
fi

# Фронтенд
cd ../frontend
echo "📦 Устанавливаем Node.js зависимости..."
npm install

echo "✅ Настройка завершена!"
echo ""
echo "📋 Для запуска:"
echo "1. docker-compose up -d"
echo "2. Или вручную:"
echo "   - Бэкенд: cd backend && uvicorn app.main:app --reload"
echo "   - Фронтенд: cd frontend && npm start"