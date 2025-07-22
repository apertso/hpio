// backend/src/models/Category.ts
import { DataTypes, Sequelize, Model, Optional } from "sequelize";
// Импортируем типы моделей, если используются в ассоциациях
// import { UserStatic } from './User';
// import { PaymentStatic } from './Payment';

interface CategoryAttributes {
  id: string;
  userId: string;
  name: string;
  builtinIconName?: string | null;
  // iconName?: string | null; // Если добавлены в модель
  // color?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryCreationAttributes
  extends Optional<
    CategoryAttributes,
    "id" | "createdAt" | "updatedAt" | "builtinIconName"
  > {}

export interface CategoryInstance
  extends Model<CategoryAttributes, CategoryCreationAttributes>,
    CategoryAttributes {
  // Define associations here for TypeScript if needed, e.g.:
  // getUser: BelongsToGetAssociationMixin<UserInstance>;
  // createPayment: HasManyCreateAssociationMixin<PaymentInstance>;
}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const Category = sequelize.define<
    CategoryInstance,
    CategoryCreationAttributes
  >(
    "Category",
    {
      id: {
        type: dataTypes.UUID,
        defaultValue: dataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        // Каждая категория принадлежит конкретному пользователю
        type: dataTypes.UUID,
        allowNull: false,
        references: {
          model: "users", // Имя таблицы пользователей
          key: "id",
        },
      },
      name: {
        // Название категории
        type: dataTypes.STRING,
        allowNull: false,
      },
      builtinIconName: {
        type: dataTypes.STRING,
        allowNull: true,
      },
      // Опционально: можно добавить поле для иконки категории, цвета и т.п.
      // iconName: { type: dataTypes.STRING, allowNull: true },
      // color: { type: dataTypes.STRING, allowNull: true },

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
      tableName: "categories",
      // Уникальный индекс для пары userId и name
      indexes: [
        {
          unique: true,
          fields: ["userId", "name"],
          name: "userCategoryUnique",
        },
        { fields: ["userId"] }, // Индекс для быстрого получения категорий пользователя
      ],
    }
  );

  // Ассоциации: Категория принадлежит одному пользователю; Категория может иметь много платежей
  (Category as any).associate = (models: any) => {
    Category.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
    Category.hasMany(models.Payment, {
      foreignKey: "categoryId",
      as: "payments", // Название ассоциации
      // Опция onDelete: 'SET NULL' или 'CASCADE'. SET NULL безопаснее при удалении категории.
      // При SET NULL, поле categoryId у связанных платежей станет NULL.
      onDelete: "SET NULL",
    });
  };

  return Category;
};
