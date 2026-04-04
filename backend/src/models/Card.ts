import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface CardAttributes {
  id: string;
  userId: string;
  name: string;
  pan?: string | null;
  bankName?: string | null;
  country?: string | null;
  currency: string;
  balance: number;
  type?: string | null;
  vendor?: string | null;
  level?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardCreationAttributes
  extends Optional<CardAttributes, "id" | "pan" | "bankName" | "country" | "type" | "vendor" | "level" | "createdAt" | "updatedAt"> {}

export interface CardInstance
  extends Model<CardAttributes, CardCreationAttributes>,
    CardAttributes {}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const Card = sequelize.define<CardInstance, CardCreationAttributes>(
    "Card",
    {
      id: {
        type: dataTypes.UUID,
        defaultValue: dataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: dataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      name: { type: dataTypes.STRING, allowNull: false },
      pan: { type: dataTypes.STRING, allowNull: true },
      bankName: { type: dataTypes.STRING, allowNull: true },
      country: { type: dataTypes.STRING(2), allowNull: true },
      currency: { type: dataTypes.STRING(3), allowNull: false, defaultValue: "RUB" },
      balance: { type: dataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      type: { type: dataTypes.STRING, allowNull: true },
      vendor: { type: dataTypes.STRING, allowNull: true },
      level: { type: dataTypes.STRING, allowNull: true },
      createdAt: { type: dataTypes.DATE, defaultValue: dataTypes.NOW },
      updatedAt: { type: dataTypes.DATE, defaultValue: dataTypes.NOW },
    },
    { tableName: "cards" }
  );

  (Card as any).associate = (models: any) => {
    Card.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    Card.hasMany(models.Payment, { foreignKey: "cardId", as: "payments" });
    Card.hasMany(models.Income, { foreignKey: "cardId", as: "incomes" });
    Card.hasMany(models.CardBalance, {
      foreignKey: "cardId",
      as: "balances",
    });
  };

  return Card;
};
