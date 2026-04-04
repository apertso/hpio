import { DataTypes, Sequelize, Model, Optional } from "sequelize";

export interface CardBalanceAttributes {
  id: string;
  userId: string;
  cardId: string;
  currency: string;
  amount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CardBalanceCreationAttributes
  extends Optional<CardBalanceAttributes, "id" | "createdAt" | "updatedAt"> {}

export interface CardBalanceInstance
  extends Model<CardBalanceAttributes, CardBalanceCreationAttributes>,
    CardBalanceAttributes {}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const CardBalance = sequelize.define<
    CardBalanceInstance,
    CardBalanceCreationAttributes
  >(
    "CardBalance",
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
      cardId: {
        type: dataTypes.UUID,
        allowNull: false,
        references: { model: "cards", key: "id" },
      },
      currency: {
        type: dataTypes.STRING(3),
        allowNull: false,
      },
      amount: {
        type: dataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
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
      tableName: "card_balances",
    }
  );

  (CardBalance as any).associate = (models: any) => {
    CardBalance.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    CardBalance.belongsTo(models.Card, { foreignKey: "cardId", as: "card" });
  };

  return CardBalance;
};
