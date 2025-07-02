// backend/src/routes/authRoutes.ts
import { Router, Request, Response } from "express";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
} from "../services/authService"; // Импорт реализованных сервисов
import logger from "../config/logger";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    // TODO: Добавить более строгую валидацию req.body (например, с express-validator)
    const { email, password } = req.body;
    const userData = await registerUser(email, password);
    res.status(201).json(userData); // Возвращаем id, email пользователя и JWT токен
  } catch (error: any) {
    logger.error("Registration error:", error);
    // Обработка ошибок (например, пользователь уже существует)
    res.status(400).json({ message: error.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    // TODO: Добавить более строгую валидацию req.body
    const { email, password } = req.body;
    const userData = await loginUser(email, password); // Функция возвращает { token, id, email }
    res.json(userData); // Возвращаем JWT токен и базовые данные пользователя
  } catch (error: any) {
    logger.error("Login error:", error);
    // Обработка ошибок (неправильный логин/пароль)
    res.status(401).json({ message: error.message });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    // TODO: Добавить валидацию email
    const { email } = req.body;
    // Сервис теперь не кидает ошибку, если email не найден, для безопасности
    const result = await forgotPassword(email);
    res.json(result); // Возвращаем безопасное сообщение
  } catch (error: any) {
    logger.error("Forgot password request error:", error);
    // В этом случае ошибка, скорее всего, внутренняя сервера или валидации запроса
    res.status(500).json({
      message: "Произошла ошибка при обработке запроса.",
      error: error.message,
    });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    const result = await resetPassword(token, password);
    res.json(result);
  } catch (error: any) {
    logger.error("Password reset error:", error);
    // Ошибка может быть из-за невалидного токена или других проблем
    res.status(400).json({ message: error.message });
  }
});

// TODO: Добавить эндпоинт для завершения сброса пароля (POST /api/auth/reset-password)

export default router;
