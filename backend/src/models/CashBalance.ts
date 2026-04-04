import { DataTypes, Sequelize, Model, Optional, ModelStatic } from "sequelize";

export interface CashBalanceAttributes {
  id: string;
  userId: string;
  currency: string;
  amount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CashBalanceCreationAttributes
  extends Optional<CashBalanceAttributes, "id" | "createdAt" | "updatedAt"> {}

export interface CashBalanceInstance
  extends Model<CashBalanceAttributes, CashBalanceCreationAttributes>,
    CashBalanceAttributes {}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const CashBalance = sequelize.define<
    CashBalanceInstance,
    CashBalanceCreationAttributes
  >(
    "CashBalance",
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
      tableName: "cash_balances",
    }
  );

  type ModelRegistry = {
    User: ModelStatic<Model>;
  };

  const cashBalanceModel = CashBalance as typeof CashBalance & {
    associate?: (models: ModelRegistry) => void;
  };

  cashBalanceModel.associate = (models) => {
    CashBalance.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };

  return CashBalance;
};
