import { DataTypes, Sequelize, Model, Optional } from "sequelize";

interface UserAttributes {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  // Add other user attributes here if needed
}

interface UserCreationAttributes
  extends Optional<UserAttributes, "id" | "createdAt" | "updatedAt"> {}

export interface UserInstance
  extends Model<UserAttributes, UserCreationAttributes>,
    UserAttributes {}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const User = sequelize.define<UserInstance, UserCreationAttributes>(
    "User",
    {
      id: {
        type: dataTypes.UUID,
        defaultValue: dataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: dataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      // Добавьте другие поля пользователя по необходимости
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
      tableName: "users", // Укажите имя таблицы
    }
  );

  // Ассоциации (один пользователь имеет много платежей)
  (User as any).associate = (models: any) => {
    User.hasMany(models.Payment, {
      foreignKey: "userId",
      as: "payments", // Название ассоциации
    });
    // Добавьте другие ассоциации (например, User hasMany Category)
  };

  return User;
};
