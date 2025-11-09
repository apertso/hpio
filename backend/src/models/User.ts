import { DataTypes, Sequelize, Model, Optional } from "sequelize";

interface UserAttributes {
  id: string;
  email: string;
  name: string;
  password: string;
  photoPath?: string | null;
  isVerified: boolean;
  verificationToken?: string | null;
  verificationTokenExpires?: Date | null;
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationTime: string; // Format HH:mm
  timezone: string;
  fcmToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Add other user attributes here if needed
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "photoPath"
    | "isVerified"
    | "verificationToken"
    | "verificationTokenExpires"
    | "emailNotifications"
    | "pushNotifications"
    | "notificationTime"
    | "timezone"
  > {}

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
      name: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      // Добавьте другие поля пользователя по необходимости
      photoPath: {
        type: dataTypes.STRING,
        allowNull: true,
      },
      isVerified: {
        type: dataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      verificationToken: {
        type: dataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      verificationTokenExpires: {
        type: dataTypes.DATE,
        allowNull: true,
      },
      emailNotifications: {
        type: dataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      pushNotifications: {
        type: dataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      notificationTime: {
        type: dataTypes.STRING(5), // HH:mm
        allowNull: false,
        defaultValue: "09:30",
      },
      timezone: {
        type: dataTypes.STRING,
        allowNull: false,
        defaultValue: "UTC",
      },
      fcmToken: {
        type: dataTypes.STRING,
        allowNull: true,
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
      tableName: "users", // Укажите имя таблицы
    }
  );

  // Ассоциации (один пользователь имеет много платежей)
  (User as any).associate = (models: any) => {
    User.hasMany(models.Payment, {
      foreignKey: "userId",
      as: "payments", // Название ассоциации
      onDelete: "CASCADE",
    });
    // Добавьте другие ассоциации (например, User hasMany Category)
    User.hasMany(models.Category, {
      foreignKey: "userId",
      as: "categories",
      onDelete: "CASCADE",
    });
    User.hasMany(models.RecurringSeries, {
      foreignKey: "userId",
      as: "series",
      onDelete: "CASCADE",
    });
  };

  return User;
};
