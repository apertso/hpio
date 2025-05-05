// backend/src/services/authService.ts
import db from "../models"; // Для доступа к моделям User
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import logger from "../config/logger";

// Вспомогательная функция для генерации JWT
const generateToken = (id: string) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: "30d", // Токен действителен 30 дней
  });
};

// Регистрация нового пользователя
export const registerUser = async (email: string, password: string) => {
  // Базовая валидация
  if (!email || !password) {
    throw new Error("Необходимо указать Email и пароль.");
  }

  // Проверка существования пользователя
  const userExists = await db.User.findOne({ where: { email } });
  if (userExists) {
    throw new Error("Пользователь с таким Email уже существует.");
  }

  // Хеширование пароля
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Создание пользователя
  const user = await db.User.create({
    email,
    password: hashedPassword,
  });

  if (user) {
    logger.info(`User registered: ${user.email}`);
    // Возвращаем пользователя и токен
    return {
      id: user.id,
      email: user.email,
      token: generateToken(user.id),
    };
  } else {
    throw new Error("Неверные данные пользователя.");
  }
};

// Вход пользователя
export const loginUser = async (email: string, password: string) => {
  // Базовая валидация
  if (!email || !password) {
    throw new Error("Необходимо указать Email и пароль.");
  }

  // Поиск пользователя по Email
  const user = await db.User.findOne({ where: { email } });

  // Проверка пользователя и пароля
  // Убедитесь, что пользователь найден И пароли совпадают
  if (user && (await bcrypt.compare(password, user.password))) {
    logger.info(`User logged in: ${user.email}`);
    // Возвращаем пользователя и токен
    return {
      id: user.id,
      email: user.email,
      token: generateToken(user.id),
    };
  } else {
    throw new Error("Неверный Email или пароль.");
  }
};

// Запрос сброса пароля (начало процесса)
export const forgotPassword = async (email: string) => {
  // TODO: Реализовать логику: найти пользователя, сгенерировать токен/код для сброса, сохранить его временно, отправить email со ссылкой/кодом
  logger.info(`Password reset requested for: ${email}`);
  // Пока просто проверяем, существует ли пользователь
  const user = await db.User.findOne({ where: { email } });
  if (!user) {
    // Важно: Не сообщайте, существует ли email, чтобы не помочь перебирать email-ы
    logger.warn(`Password reset requested for non-existent email: ${email}`);
    // return true; // Сообщаем, что запрос принят (для безопасности)
    throw new Error(
      "Если пользователь с таким Email существует, инструкции по сбросу пароля будут отправлены на указанный адрес."
    ); // Более безопасный ответ
  }

  // TODO: Здесь будет логика генерации токена сброса, сохранения в БД и отправки Email
  // Пока просто возвращаем успех, имитируя отправку
  logger.info(`Password reset initiated for user ID: ${user.id}`);
  // Имитация отправки письма
  // await sendPasswordResetEmail(user.email, resetToken); // TODO: реализовать функцию отправки письма

  // Возвращаем сообщение, которое не раскрывает существование email
  // throw new Error('Если пользователь с таким Email существует, инструкции по сброса пароля будут отправлены на указанный адрес.'); // Уже сделано выше
  return {
    message:
      "Если пользователь с таким Email существует, инструкции по сброса пароля будут отправлены на указанный адрес.",
  };
};

// TODO: Реализовать функцию сброса пароля по токену/коду (endpoint и сервис)
// export const resetPassword = async (token: string, newPassword: string) => { ... }
