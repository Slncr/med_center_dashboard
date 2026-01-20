FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Устанавливаем serve для статических файлов
RUN npm install -g serve

# Запускаем приложение
CMD ["serve", "-s", "build", "-l", "3000"]