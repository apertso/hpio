import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/appConfig";
import db from "../models"; // Импорт для доступа к моделям

const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  // Проверяем наличие токена в заголовке Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.query.token && typeof req.query.token === "string") {
    // Также проверяем токен в query параметрах (для запросов типа <img> из браузера)
    token = req.query.token;
  }

  // Если токена нет ни в заголовке, ни в query
  if (!token) {
    return res.status(401).json({ message: "Не авторизован, нет токена" });
  }

  try {
    // Верифицируем токен
    const decoded: any = jwt.verify(token, config.jwtSecret);

    // Находим пользователя по ID из токена и добавляем его к объекту запроса
    // Исключаем поле пароля для безопасности
    const user = await db.User.findByPk(decoded.id, {
      attributes: ["id", "email"], // Выбираем только нужные поля
    });

    if (!user) {
      return res
        .status(401)
        .json({ message: "Не авторизован, пользователь не найден" });
    }

    // Добавляем данные пользователя к запросу
    req.user = {
      id: user.id,
      email: user.email,
    };
    next(); // Переходим к следующему middleware или обработчику маршрута
  } catch (error) {
    console.error(error); // Логируем ошибку верификации
    res.status(401).json({ message: "Не авторизован, токен недействителен" });
  }
};

export { protect };
