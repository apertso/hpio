import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Literal } from "sequelize/types/utils";
// Импортируем типы моделей, если они используются в ассоциациях (для TypeScript)
// import { UserStatic } from './User'; // Вам может потребоваться создать файл типов для моделей
// import { CategoryStatic } from './Category';

// Определим тип PaymentCreationAttributes, если нужны более строгие типы
// Но для простоты пока обойдемся без них в этом примере

interface PaymentAttributes {
  id: string;
  userId: string;
  title: string;
  amount: number;
  dueDate: string; // DATEONLY представляется как string
  categoryId?: string | null; // Add categoryId to attributes
  status: "upcoming" | "overdue" | "completed" | "deleted";
  completedAt?: Date | null | Literal;
  isRecurrent: boolean;
  recurrencePattern?: "daily" | "weekly" | "monthly" | "yearly" | null;
  recurrenceEndDate?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null; // MIME type of the uploaded file
  fileSize?: number | null; // Size of the uploaded file in bytes
  uploadedAt?: Date | null; // Timestamp of when the file was uploaded
  iconPath?: string | null;
  iconType?: "builtin" | "custom" | null;
  builtinIconName?: string | null;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string | null; // !!! Добавим поле для связи экземпляров с их "родительским" шаблоном/первым экземпляром
}

interface PaymentCreationAttributes
  extends Optional<
    PaymentAttributes,
    | "id"
    | "categoryId" // Add categoryId to optional fields
    | "completedAt"
    | "recurrencePattern"
    | "recurrenceEndDate"
    | "filePath"
    | "fileName"
    | "fileMimeType"
    | "fileSize"
    | "uploadedAt"
    | "iconPath"
    | "iconType"
    | "builtinIconName"
    | "createdAt"
    | "updatedAt"
    | "parentId" // Add parentId to optional fields
  > {}

export interface PaymentInstance
  extends Model<PaymentAttributes, PaymentCreationAttributes>,
    PaymentAttributes {}

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
        // !!! Новое поле для привязки к категории
        type: dataTypes.UUID,
        allowNull: true, // Платеж может быть без категории
        references: {
          model: "categories", // Имя таблицы категорий
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
      isRecurrent: {
        type: dataTypes.BOOLEAN,
        defaultValue: false,
      },
      recurrencePattern: {
        // Шаблон повторения
        type: dataTypes.ENUM("daily", "weekly", "monthly", "yearly"),
        allowNull: true, // Разрешено NULL для разовых платежей
      },
      recurrenceEndDate: {
        // Дата окончания серии повторений
        type: dataTypes.DATEONLY,
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
      iconPath: {
        // Путь к пользовательской иконке (если iconType === 'custom')
        type: dataTypes.STRING,
        allowNull: true,
      },
      iconType: {
        // Тип иконки ('builtin' или 'custom')
        type: dataTypes.ENUM("builtin", "custom"),
        allowNull: true, // NULL, если иконка не выбрана
      },
      // Если iconType === 'builtin', здесь может храниться имя встроенной иконки
      builtinIconName: {
        type: dataTypes.STRING,
        allowNull: true,
      },
      parentId: {
        type: dataTypes.UUID,
        allowNull: true, // NULL для разовых платежей и первого экземпляра серии
        references: {
          model: "payments", // Ссылка на ту же таблицу
          key: "id",
        },
        onDelete: "SET NULL", // Если родительский платеж удаляется (например, перманентно), потомки не должны удаляться, но связь теряется.
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
      tableName: "payments", // Имя таблицы
      // Индексы для оптимизации запросов
      indexes: [
        { fields: ["userId"] },
        { fields: ["dueDate"] },
        { fields: ["status"] },
        { fields: ["categoryId"] }, // !!! Добавляем индекс для быстрого поиска по категории
        { fields: ["parentId"] }, // !!! Индекс для поиска потомков
      ],
    }
  );

  // Ассоциации
  (Payment as any).associate = (models: any) => {
    Payment.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
    // !!! Добавляем ассоциацию Payment принадлежит Category
    Payment.belongsTo(models.Category, {
      foreignKey: "categoryId",
      as: "category", // Название ассоциации для запросов (например, Payment.findOne({ include: 'category' }))
    });
    // !!! Добавляем само-ассоциацию (один Payment имеет много Payment'ов-потомков)
    Payment.hasMany(models.Payment, {
      foreignKey: "parentId",
      as: "instances", // Название ассоциации для получения потомков
    });
    // Связь many-to-one с родителем уже описана через parentId + belongsTo не нужна,
    // т.к. поле parentId уже является foreignKey.
    // Payment.belongsTo(models.Payment, { foreignKey: 'parentId', as: 'parent' }); // Можно добавить для удобства, но уже есть через parentId reference
  };

  return Payment;
};
