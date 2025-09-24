import { Model, Sequelize, DataTypes } from "sequelize"; // Import DataTypes
import { config } from "../config/appConfig";
import logger from "../config/logger";
import User from "./User";
import Payment from "./Payment";
import Category from "./Category"; // Import Category model
import RecurringSeries from "./RecurringSeries"; // Import RecurringSeries model
import SystemTaskLog from "./SystemTaskLog";
import Feedback from "./Feedback";

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect as any,
    dialectOptions: config.database.dialectOptions,
    logging: config.database.logging,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    // Опционально: для MS SQL может потребоваться настройка даты
    // timezone: '+00:00' // Если храните UTC
  }
);

interface Associate {
  associate: (db: Db) => void;
}

interface Db {
  sequelize: Sequelize;
  Sequelize: typeof Sequelize;
  User: Model & Associate; // Assuming User model has an associate method
  Payment: Model & Associate; // Assuming Payment model has an associate method
  Category: Model & Associate; // Add Category to the Db interface
  RecurringSeries: Model & Associate; // Add RecurringSeries to the Db interface
  SystemTaskLog: Model;
  Feedback: Model & Associate;
  // Add other models here with & Associate if they have an associate method
  [key: string]: any; // Allow indexing with strings for other potential properties
}

const db = {
  sequelize,
  Sequelize,
  User: User(sequelize, DataTypes), // Pass DataTypes
  Payment: Payment(sequelize, DataTypes), // Pass DataTypes
  Category: Category(sequelize, DataTypes), // Add Category model to db object
  RecurringSeries: RecurringSeries(sequelize, DataTypes), // Add RecurringSeries model to db object
  SystemTaskLog: SystemTaskLog(sequelize),
  Feedback: Feedback(sequelize, DataTypes),
  // Сюда же можно добавить Category, Notification и другие модели
};

// Устанавливаем ассоциации между моделями
Object.keys(db).forEach((modelName) => {
  if (
    modelName !== "sequelize" &&
    modelName !== "Sequelize" &&
    (db[modelName as keyof typeof db] as any).associate
  ) {
    (db[modelName as keyof typeof db] as any).associate(db);
  }
});

// Синхронизация моделей с базой данных (создание таблиц)
// В продакшене обычно используют миграции вместо sync({ force: true }) или sync()
sequelize
  .sync()
  .then(() => {
    logger.info("Database & tables created/synced!");
  })
  .catch((err) => {
    logger.error("Error syncing database:", err);
  });

export default db;
