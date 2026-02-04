#!/usr/bin/env python

import sys
import os

# Добавляем путь к проекту
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import sessionmaker
from app.core.database import engine
from app.models.user import User, UserRole
from app.crud.user import get_password_hash

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_user_cli():
    db = SessionLocal()

    try:
        username = input("Введите имя пользователя: ").strip()
        if not username:
            print("Имя пользователя не может быть пустым.")
            return

        email = input("Введите email (опционально): ").strip() or None
        full_name = input("Введите полное имя (опционально): ").strip() or None

        password = input("Введите пароль: ")
        confirm_password = input("Подтвердите пароль: ")

        if password != confirm_password:
            print("Пароли не совпадают.")
            return

        role_input = input("Введите роль (doctor/nurse/admin, по умолчанию nurse): ").strip().lower()
        if role_input == "doctor":
            role = UserRole.DOCTOR
        elif role_input == "admin":
            role = UserRole.ADMIN
        else:
            role = UserRole.NURSE  # по умолчанию

        # Проверим, существует ли пользователь
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"Пользователь с именем '{username}' уже существует.")
            return

        # Хешируем пароль
        hashed_password = get_password_hash(password)

        # Создаём пользователя
        user = User(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            role=role
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"Пользователь '{user.username}' успешно создан с ID {user.id}.")

    except KeyboardInterrupt:
        print("\nОтменено пользователем.")
    except Exception as e:
        print(f"Ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_user_cli()