-- ./backend/init.sql
-- Создаем пользователя, если не существует
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'med_user') THEN
        CREATE USER med_user WITH PASSWORD 'med_pass';
    END IF;
END
$$;

-- Создаем базу, если не существует
SELECT 'CREATE DATABASE med_center OWNER med_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'med_center')\gexec

-- Даем права
GRANT ALL PRIVILEGES ON DATABASE med_center TO med_user;