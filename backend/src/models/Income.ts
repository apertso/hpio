import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { TransactionCategoryInstance } from "./TransactionCategory";

export interface IncomeAttributes {
  id: string;
  userId: string;
  categoryId?: string | null;
  cardId?: string | null;
  amount: number;
  currency: string;
  exchangeRate: number;
  date: string;
  method: "cash" | "card" | "transfer" | "other";
  comment?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncomeCreationAttributes
  extends Optional<IncomeAttributes, "id" | "categoryId" | "cardId" | "comment" | "createdAt" | "updatedAt"> {}

export interface IncomeInstance
  extends Model<IncomeAttributes, IncomeCreationAttributes>,
    IncomeAttributes {
  transactionCategory?: TransactionCategoryInstance;
}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const Income = sequelize.define<IncomeInstance, IncomeCreationAttributes>(
    "Income",
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
      categoryId: {
        type: dataTypes.UUID,
        allowNull: true,
        references: { model: "transaction_categories", key: "id" },
      },
      cardId: {
        type: dataTypes.UUID,
        allowNull: true,
        references: { model: "cards", key: "id" },
      },
      amount: { type: dataTypes.DECIMAL(18, 2), allowNull: false },
      currency: { type: dataTypes.STRING(3), allowNull: false, defaultValue: "RUB" },
      exchangeRate: { type: dataTypes.DECIMAL(10, 6), allowNull: false, defaultValue: 1.0 },
      date: { type: dataTypes.DATEONLY, allowNull: false },
      method: {
        type: dataTypes.ENUM("cash", "card", "transfer", "other"),
        allowNull: false,
        defaultValue: "cash"
      },
      comment: { type: dataTypes.TEXT, allowNull: true },
      createdAt: { type: dataTypes.DATE, defaultValue: dataTypes.NOW },
      updatedAt: { type: dataTypes.DATE, defaultValue: dataTypes.NOW },
    },
    { tableName: "incomes" }
  );

  (Income as any).associate = (models: any) => {
    Income.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    Income.belongsTo(models.TransactionCategory, {
      foreignKey: "categoryId",
      as: "transactionCategory",
      constraints: false,
    });
    Income.belongsTo(models.Card, { foreignKey: "cardId", as: "card" });
  };

  return Income;
};
