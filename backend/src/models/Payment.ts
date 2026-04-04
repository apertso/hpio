import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Literal } from "sequelize/types/utils";
import { TransactionCategoryInstance } from "./TransactionCategory";
// Импортируем типы моделей, если они используются в ассоциациях (для TypeScript)
// import { UserStatic } from './User'; // Вам может потребоваться создать файл типов для моделей
// import { CategoryStatic } from './Category';

// Определим тип PaymentCreationAttributes, если нужны более строгие типы
// Но для простоты пока обойдемся без них в этом примере

export interface PaymentAttributes {
  id: string;
  userId: string;
  title: string;
  amount: number;
  dueDate: string; // DATEONLY представляется как string
  categoryId?: string | null; // Add categoryId to attributes
  status: "upcoming" | "overdue" | "completed" | "deleted";
  completedAt?: Date | null | Literal;
  filePath?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null; // MIME type of the uploaded file
  fileSize?: number | null; // Size of the uploaded file in bytes
  uploadedAt?: Date | null; // Timestamp of when the file was uploaded
  builtinIconName?: string | null;
  remind: boolean;
  autoCreated: boolean;
  createdAt: Date;
  updatedAt: Date;
  seriesId?: string | null; // Link to RecurringSeries
  currency: string;
  exchangeRate: number;
  cardId?: string | null;
  method: "cash" | "card" | "transfer" | "other";
}

interface PaymentCreationAttributes
  extends Optional<
    PaymentAttributes,
    | "id"
    | "categoryId" // Add categoryId to optional fields
    | "completedAt"
    | "filePath"
    | "fileName"
    | "fileMimeType"
    | "fileSize"
    | "uploadedAt"
    | "builtinIconName"
    | "remind"
    | "autoCreated"
    | "createdAt"
    | "updatedAt"
    | "seriesId" // Add seriesId to optional fields
    | "currency"
    | "exchangeRate"
    | "cardId"
    | "method"
  > {}

export interface PaymentInstance
  extends Model<PaymentAttributes, PaymentCreationAttributes>,
    PaymentAttributes {
  transactionCategory?: TransactionCategoryInstance;
}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const Payment = sequelize.define<PaymentInstance, PaymentCreationAttributes>(
    "Payment",
    {
      id: {
        type: dataTypes.UUID,
        defaultValue: dataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: dataTypes.UUID,
        allowNull: false,
        references: {
          model: "users", // Имя таблицы пользователей
          key: "id",
        },
      },
      categoryId: {
        type: dataTypes.UUID,
        allowNull: true, // Платеж может быть без категории
        references: {
          model: "transaction_categories",
          key: "id",
        },
        // При удалении категории, categoryId в платежах станет NULL
        onDelete: "SET NULL",
      },
      title: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: dataTypes.DECIMAL(18, 2), // Увеличил точность/масштаб на всякий случай
        allowNull: false,
      },
      dueDate: {
        type: dataTypes.DATEONLY, // Только дата без времени
        allowNull: false,
      },
      status: {
        type: dataTypes.ENUM("upcoming", "overdue", "completed", "deleted"), // Статусы согласно ТЗ 2.7
        defaultValue: "upcoming",
        allowNull: false,
      },
      completedAt: {
        type: dataTypes.DATE, // Дата и время выполнения (для статуса 'completed')
        allowNull: true,
      },
      // Поля для файлов (будут реализованы в Части 11)
      filePath: {
        type: dataTypes.STRING, // Относительный путь к файлу
        allowNull: true,
      },
      fileName: {
        // Оригинальное имя файла для отображения
        type: dataTypes.STRING,
        allowNull: true,
      },
      fileMimeType: {
        type: dataTypes.STRING,
        allowNull: true,
      },
      fileSize: {
        type: dataTypes.INTEGER, // Store size as integer
        allowNull: true,
      },
      uploadedAt: {
        type: dataTypes.DATE,
        allowNull: true,
      },
      // Поля для иконок (будут реализованы в Части 13)
      // Если iconType === 'builtin', здесь может храниться имя встроенной иконки
      builtinIconName: {
        type: dataTypes.STRING,
        allowNull: true,
      },
      remind: {
        type: dataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      autoCreated: {
        type: dataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      seriesId: {
        type: dataTypes.UUID,
        allowNull: true, // NULL for non-recurring payments
        references: {
          model: "reccuringSeries", // Link to reccuringSeries table
          key: "id",
        },
        onDelete: "SET NULL", // If reccuringSeries is deleted, seriesId in payments becomes NULL
      },
      currency: {
        type: dataTypes.STRING(3),
        allowNull: false,
        defaultValue: "RUB",
      },
      exchangeRate: {
        type: dataTypes.DECIMAL(10, 6),
        allowNull: false,
        defaultValue: 1.0,
      },
      cardId: {
        type: dataTypes.UUID,
        allowNull: true,
        references: { model: "cards", key: "id" },
        onDelete: "SET NULL",
      },
      method: {
        type: dataTypes.ENUM("cash", "card", "transfer", "other"),
        allowNull: false,
        defaultValue: "cash",
      },
      createdAt: {
        type: dataTypes.DATE,
        defaultValue: dataTypes.NOW,
      },
      updatedAt: {
        type: dataTypes.DATE,
        defaultValue: dataTypes.NOW,
      },
    },
    {
      tableName: "payments", // Table name
      // Indexes for query optimization
      indexes: [
        { fields: ["userId"] },
        { fields: ["dueDate"] },
        { fields: ["status"] },
        { fields: ["categoryId"] }, // Add index for category
        { fields: ["seriesId"] }, // Add index for seriesId
      ],
    }
  );

  // Associations
  (Payment as any).associate = (models: any) => {
    Payment.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
    Payment.belongsTo(models.TransactionCategory, {
      foreignKey: "categoryId",
      as: "transactionCategory",
      constraints: false,
    });
    // Add association Payment belongs to RecurringSeries
    Payment.belongsTo(models.RecurringSeries, {
      foreignKey: "seriesId",
      as: "series", // Association name for queries
    });
    Payment.belongsToMany(models.Tag, {
      through: models.PaymentTag,
      foreignKey: "paymentId",
      otherKey: "tagId",
      as: "tags",
    });
  };

  return Payment;
};
