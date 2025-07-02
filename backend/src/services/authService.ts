// backend/src/services/authService.ts
import db from "../models"; // Для доступа к моделям User
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import logger from "../config/logger";
import { UserInstance } from "../models/User";
import { Op } from "sequelize";
import { deleteFileFromFS } from "./fileService";
import path from "path";
import { sendPasswordResetEmail } from "./emailService"; // <-- Импортируем email сервис

// Вспомогательная функция для генерации JWT
const generateToken = (id: string) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: "30d", // Токен действителен 30 дней
  });
};

// Вспомогательная функция для генерации токена сброса пароля
const generatePasswordResetToken = (id: string) => {
  return jwt.sign({ id }, config.jwtPasswordResetSecret, {
    expiresIn: "15m", // Токен для сброса действителен 15 минут
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
  const user = await db.User.findOne({ where: { email } });

  if (user) {
    // Если пользователь найден, генерируем токен и отправляем письмо
    const resetToken = generatePasswordResetToken(user.id);
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    // Асинхронно отправляем email
    sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
      // Логируем ошибку отправки, но не сообщаем о ней пользователю
      logger.error("Error sending password reset email asynchronously:", err);
    });
  } else {
    // Если пользователь не найден, логируем это, но ничего не делаем
    logger.warn(`Password reset requested for non-existent email: ${email}`);
  }

  // Вне зависимости от того, найден ли пользователь, возвращаем одинаковое сообщение
  // Это мера безопасности для предотвращения перебора email-адресов
  return {
    message:
      "Если пользователь с таким Email существует, инструкции по сбросу пароля будут отправлены на указанный адрес.",
  };
};

// Сброс пароля с использованием токена
export const resetPassword = async (token: string, newPassword: string) => {
  if (!token || !newPassword) {
    throw new Error("Токен и новый пароль обязательны.");
  }

  try {
    // Верифицируем токен
    const decoded: any = jwt.verify(token, config.jwtPasswordResetSecret);

    // Находим пользователя по ID из токена
    const user = await db.User.findByPk(decoded.id);

    if (!user) {
      throw new Error("Пользователь не найден.");
    }

    // Хешируем и сохраняем новый пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    logger.info(`Password reset successfully for user: ${user.email}`);
    return { message: "Пароль успешно сброшен." };
  } catch (error) {
    // Ошибка может быть из-за невалидного или истекшего токена
    logger.error("Password reset failed:", error);
    throw new Error("Неверный или истекший токен для сброса пароля.");
  }
};

// Получение профиля пользователя
export const getUserProfile = async (userId: string) => {
  const user = await db.User.findByPk(userId, {
    attributes: ["id", "email", "photoPath", "createdAt"],
  });

  if (!user) {
    throw new Error("Пользователь не найден.");
  }
  return user;
};

// Обновление профиля пользователя (email, пароль)
export const updateUserProfile = async (
  userId: string,
  data: { email?: string; password?: string; currentPassword?: string }
) => {
  const user = await db.User.findByPk(userId);
  if (!user) {
    throw new Error("Пользователь не найден.");
  }

  // Обновление email
  if (data.email && data.email !== user.email) {
    const existingUser = await db.User.findOne({
      where: { email: data.email, id: { [Op.ne]: userId } },
    });
    if (existingUser) {
      throw new Error("Пользователь с таким Email уже существует.");
    }
    user.email = data.email;
  }

  // Обновление пароля
  if (data.password) {
    if (!data.currentPassword) {
      throw new Error("Текущий пароль обязателен для смены пароля.");
    }
    const isMatch = await bcrypt.compare(data.currentPassword, user.password);
    if (!isMatch) {
      throw new Error("Неверный текущий пароль.");
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(data.password, salt);
  }

  await user.save();
  logger.info(`User profile updated for user ID: ${userId}`);
  return await getUserProfile(userId); // Возвращаем обновленный профиль
};

// Прикрепление фотографии к профилю пользователя
export const attachPhotoToUser = async (
  userId: string,
  file: Express.Multer.File
) => {
  const user = (await db.User.findByPk(userId)) as UserInstance;
  if (!user) {
    // Если пользователь не найден, удаляем загруженный файл
    await deleteFileFromFS(userId, "profile", file.filename);
    throw new Error("Пользователь не найден.");
  }

  // Если у пользователя уже есть фото, удаляем старое
  if (user.photoPath) {
    try {
      const oldFileName = path.basename(user.photoPath);
      await deleteFileFromFS(userId, "profile", oldFileName);
    } catch (e) {
      logger.error(`Could not delete old profile photo: ${user.photoPath}`, e);
    }
  }

  // Относительный путь для сохранения в БД
  const relativePath = path.join("users", userId, "profile", file.filename);
  user.photoPath = relativePath;
  await user.save();

  logger.info(`User photo updated for user ID: ${userId}`);
  return { photoPath: user.photoPath };
};

// Удаление аккаунта пользователя
export const deleteUserAccount = async (userId: string) => {
  const user = await db.User.findByPk(userId);
  if (!user) {
    throw new Error("Пользователь не найден.");
  }

  // Удаляем директорию пользователя со всеми файлами
  try {
    const userUploadsDir = path.join(config.uploadDir, "users", userId);
    await deleteFileFromFS(userId, ""); // Передаем пустой paymentId, чтобы удалить папку /users/userId
  } catch (error) {
    logger.error(
      `Error deleting user upload directory for user ${userId}:`,
      error
    );
    // Продолжаем удаление пользователя из БД даже если файлы не удалились
  }

  // Удаляем пользователя из БД (связанные данные удалятся каскадно)
  await user.destroy();
  logger.info(`User account deleted for user ID: ${userId}`);
  return { message: "Аккаунт успешно удален." };
};
