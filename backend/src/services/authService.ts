// backend/src/services/authService.ts
import db from "../models"; // Для доступа к моделям User
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/appConfig";
import logger from "../config/logger";
import { UserInstance } from "../models/User";
import { Op } from "sequelize";
import path from "path";
import fs from "fs/promises";
import { sendPasswordResetEmail, sendVerificationEmail } from "./emailService";
import crypto from "crypto";
import { StorageFactory } from "./storage/StorageFactory";

// Вспомогательная функция для валидации пароля
const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return "Пароль должен быть не менее 8 символов.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Пароль должен содержать хотя бы одну заглавную букву.";
  }
  if (!/[a-z]/.test(password)) {
    return "Пароль должен содержать хотя бы одну строчную букву.";
  }
  if (!/\d/.test(password)) {
    return "Пароль должен содержать хотя бы одну цифру.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Пароль должен содержать хотя бы один специальный символ.";
  }
  return null;
};

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
export const registerUser = async (
  name: string,
  email: string,
  password: string
) => {
  // Базовая валидация
  if (!name || !email || !password) {
    throw new Error("Необходимо указать Имя, Email и пароль.");
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  // Проверка существования пользователя
  const userExists = await db.User.findOne({ where: { email } });
  if (userExists) {
    throw new Error("Пользователь с таким Email уже существует.");
  }

  // Хеширование пароля
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Обернем создание пользователя и категорий в транзакцию для атомарности
  const transaction = await db.sequelize.transaction();
  try {
    // Создание пользователя
    const user = await db.User.create(
      {
        name,
        email,
        password: hashedPassword,
        isVerified: false,
        timezone: config.defaultTimezone,
      },
      { transaction }
    );

    // Создание стандартного набора категорий для нового пользователя
    const defaultCategories = [
      { name: "Жильё и коммунальные", icon: "home" },
      { name: "Питание", icon: "shopping-cart" },
      { name: "Транспорт", icon: "truck" },
      { name: "Здоровье", icon: "heart" },
      { name: "Покупки и одежда", icon: "gift" },
      { name: "Развлечения", icon: "film" },
      { name: "Образование", icon: "book-open" },
      { name: "Семья и дети", icon: "sparkles" },
      { name: "Финансы и кредиты", icon: "credit-card" },
      { name: "Прочее", icon: "wrench" },
    ];

    const categoriesToCreate = defaultCategories.map((category) => ({
      userId: user.id,
      name: category.name,
      builtinIconName: category.icon,
    }));

    await db.Category.bulkCreate(categoriesToCreate, { transaction });

    // Генерируем токен верификации
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
    await user.save({ transaction });

    await transaction.commit();

    // Отправляем письмо верификации
    const verificationLink = `${config.frontendUrl}/verify-email?token=${verificationToken}`;
    sendVerificationEmail(user.email, user.name, verificationLink).catch(
      (err) => {
        logger.error("Error sending verification email asynchronously:", err);
      }
    );

    logger.info(
      `User registered: ${user.email} and default categories created.`
    );
    // Возвращаем пользователя и токен
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id),
      isVerified: user.isVerified,
      photoPath: user.photoPath,
      timezone: user.timezone, // <-- ADD THIS LINE
    };
  } catch (error) {
    await transaction.rollback();
    logger.error("User registration failed, transaction rolled back", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Не удалось зарегистрировать пользователя.");
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
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id),
      isVerified: user.isVerified,
      photoPath: user.photoPath,
      notificationMethod: user.notificationMethod,
      notificationTime: user.notificationTime,
      timezone: user.timezone, // <-- ADD THIS LINE
    };
  } else {
    throw new Error("Неверный Email или пароль.");
  }
};

// Запрос сброса пароля (начало процесса)
export const forgotPassword = async (email: string) => {
  const user = await db.User.findOne({ where: { email } });

  if (user) {
    if (!user.isVerified) {
      logger.warn(
        `Password reset requested for unverified email: ${email}. Aborting.`
      );
      return {
        message:
          "Если пользователь с таким Email существует и его адрес подтвержден, инструкции по сбросу пароля будут отправлены.",
      };
    }
    // Если пользователь найден, генерируем токен и отправляем письмо
    const resetToken = generatePasswordResetToken(user.id);
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    // Асинхронно отправляем email
    sendPasswordResetEmail(user.email, user.name, resetUrl).catch((err) => {
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
      "Если пользователь с таким Email существует и его адрес подтвержден, инструкции по сбросу пароля будут отправлены на указанный адрес.",
  };
};

// Сброс пароля с использованием токена
export const resetPassword = async (token: string, newPassword: string) => {
  if (!token || !newPassword) {
    throw new Error("Токен и новый пароль обязательны.");
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    throw new Error(passwordError);
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
    attributes: [
      "id",
      "email",
      "name",
      "photoPath",
      "createdAt",
      "isVerified",
      "notificationMethod",
      "notificationTime",
      "timezone", // <-- ADD THIS LINE
      "fcmToken",
    ],
  });

  if (!user) {
    throw new Error("Пользователь не найден.");
  }
  return user;
};

// Обновление профиля пользователя (email, пароль)
export const updateUserProfile = async (
  userId: string,
  data: {
    name?: string;
    email?: string;
    password?: string;
    currentPassword?: string;
    notificationMethod?: "email" | "push" | "none";
    notificationTime?: string;
    timezone?: string; // <-- ADD THIS LINE
  }
) => {
  const user = await db.User.findByPk(userId);
  if (!user) {
    throw new Error("Пользователь не найден.");
  }

  // Обновление имени
  if (data.name) {
    user.name = data.name;
  }

  // Update notification settings
  if (data.notificationMethod) {
    user.notificationMethod = data.notificationMethod;
  }
  if (data.notificationTime) {
    // TODO: Validate HH:mm format
    user.notificationTime = data.notificationTime;
  }

  if (data.timezone) {
    // <-- ADD THIS BLOCK
    // TODO: Optionally validate against a list of IANA timezones
    user.timezone = data.timezone;
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
    user.isVerified = false;
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

    const verificationLink = `${config.frontendUrl}/verify-email?token=${verificationToken}`;
    sendVerificationEmail(user.email, user.name, verificationLink).catch(
      (err) => {
        logger.error("Error sending verification email on email change:", err);
      }
    );
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
    const passwordError = validatePassword(data.password);
    if (passwordError) {
      throw new Error(passwordError);
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
  const storage = StorageFactory.getStorage();

  const user = (await db.User.findByPk(userId)) as UserInstance;
  if (!user) {
    throw new Error("Пользователь не найден.");
  }

  // Если у пользователя уже есть фото, удаляем старое
  if (user.photoPath) {
    try {
      await storage.delete(user.photoPath);
    } catch (e) {
      logger.error(`Could not delete old profile photo: ${user.photoPath}`, e);
    }
  }

  // Генерируем уникальное имя файла
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const fileExtension = path.extname(file.originalname);
  const newFileName = `profile-${uniqueSuffix}${fileExtension}`;

  // Относительный путь для сохранения в БД (используем / для совместимости)
  const relativePath = ["users", userId, "profile", newFileName].join("/");

  // Загружаем файл через стратегию
  await storage.upload(relativePath, file.buffer, file.mimetype);

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

  const transaction = await db.sequelize.transaction();

  try {
    // Вручную удаляем связанные записи в рамках транзакции
    // Сначала удаляем платежи, так как они могут ссылаться на другие таблицы
    await db.Payment.destroy({ where: { userId }, transaction });
    // Затем удаляем серии, которые также могут иметь зависимости
    await db.RecurringSeries.destroy({ where: { userId }, transaction });
    // После этого удаляем категории
    await db.Category.destroy({ where: { userId }, transaction });

    // Наконец, удаляем самого пользователя
    await user.destroy({ transaction });

    // Если все операции с БД успешны, подтверждаем транзакцию
    await transaction.commit();
  } catch (error) {
    // В случае ошибки откатываем все изменения в БД
    await transaction.rollback();
    logger.error(`Error deleting database records for user ${userId}:`, error);
    // Пробрасываем ошибку дальше, чтобы контроллер мог ее обработать
    throw error;
  }

  // После успешного удаления из БД удаляем файлы пользователя из хранилища.
  // Эта операция выполняется вне транзакции.
  const storage = StorageFactory.getStorage();
  try {
    const userUploadsPath = `users/${userId}`;
    await storage.delete(userUploadsPath);
    logger.info(`User upload directory deleted for user ${userId}`);
  } catch (error: any) {
    logger.error(
      `Error deleting user upload directory for user ${userId}:`,
      error
    );
  }

  logger.info(`User account deleted for user ID: ${userId}`);
  return { message: "Аккаунт успешно удален." };
};

export const resendVerificationEmail = async (userId: string) => {
  const user = await db.User.findByPk(userId);

  if (!user) {
    throw new Error("Пользователь не найден.");
  }

  if (user.isVerified) {
    throw new Error("Email уже подтвержден.");
  }

  // Генерируем новый токен верификации
  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.verificationToken = verificationToken;
  user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
  await user.save();

  // Отправляем письмо верификации
  const verificationLink = `${config.frontendUrl}/verify-email?token=${verificationToken}`;
  sendVerificationEmail(user.email, user.name, verificationLink).catch(
    (err) => {
      logger.error("Error resending verification email asynchronously:", err);
    }
  );

  logger.info(`Resent verification email to: ${user.email}`);

  return { message: "Новая ссылка для подтверждения отправлена на ваш email." };
};

export const verifyEmail = async (token: string) => {
  if (!token) {
    throw new Error("Токен верификации не предоставлен.");
  }
  const user = await db.User.findOne({
    where: {
      verificationToken: token,
      verificationTokenExpires: { [Op.gt]: new Date() },
    },
  });
  if (!user) {
    throw new Error("Неверный или истекший токен верификации.");
  }
  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  await user.save();
  logger.info(`Email verified for user: ${user.email}`);
  return { message: "Email успешно подтвержден." };
};
