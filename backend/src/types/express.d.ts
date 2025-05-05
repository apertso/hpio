import { UserInstance } from "../models/User"; // Импортируйте тип UserInstance

declare global {
  namespace Express {
    interface Request {
      user?: Pick<UserInstance, "id", "email">; // Добавляем свойство user в интерфейс Request
    }
  }
}
