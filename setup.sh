#!/bin/bash

set -e

echo "🚀 Настройка проекта Medical Center Dashboard"

# Создаем виртуальное окружение Python
echo "📦 Создаем виртуальное окружение Python..."
python3 -m venv venv
source venv/bin/activate

# Устанавливаем Python зависимости
echo "📦 Устанавливаем Python зависимости..."
cd backend
pip install --upgrade pip
pip install -r requirements.txt

# Инициализируем Alembic
echo "🗄️ Инициализируем Alembic..."
alembic init alembic
cp ../alembic.ini.example alembic.ini

# Настраиваем окружение
echo "🔧 Настраиваем окружение..."
cp .env.example .env
echo "⚠️ Не забудьте отредактировать .env файл!"

# Устанавливаем Node.js зависимости
echo "📦 Устанавливаем Node.js зависимости..."
cd ../frontend
npm install

# Создаем окружение React
echo "🔧 Настраиваем React окружение..."
cp .env.example .env.local
echo "⚠️ Не забудьте отредактировать .env.local файл!"

# Возвращаемся в корень
cd ..

echo "✅ Настройка завершена!"
echo ""
echo "📋 Далее:"
echo "1. Отредактируйте файлы .env в backend/ и frontend/"
echo "2. Запустите PostgreSQL и Redis"
echo "3. Запустите проект: docker-compose up -d"
echo "4. Или вручную:"
echo "   - Запустите бэкенд: cd backend && uvicorn app.main:app --reload"
echo "   - Запустите фронтенд: cd frontend && npm start"
echo ""
echo "🌐 Доступы:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"