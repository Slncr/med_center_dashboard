# frontend/Dockerfile
# Этап 1: Сборка React приложения
FROM node:18-alpine as builder

WORKDIR /app

# Копируем package.json отдельно для кэширования слоев
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --silent

# Копируем исходный код
COPY . .

# Собираем production версию
RUN npm run build

# Этап 2: Nginx для serving
FROM nginx:alpine

# Копируем nginx конфигурацию
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранное React приложение из builder этапа
COPY --from=builder /app/build /usr/share/nginx/html

# Удаляем дефолтный nginx welcome page
RUN rm -rf /usr/share/nginx/html/*.md

# Открываем порт 3000
EXPOSE 3000

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]