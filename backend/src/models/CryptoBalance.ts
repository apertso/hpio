import { DataTypes, Sequelize, Model, Optional } from "sequelize";

export interface CryptoBalanceAttributes {
  id: string;
  userId: string;
  coinId: string; // coingecko id
  symbol: string;
  name: string;
  walletAddress?: string; // Optional wallet address or label
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CryptoBalanceCreationAttributes
  extends Optional<CryptoBalanceAttributes, "id" | "createdAt" | "updatedAt"> {}

export interface CryptoBalanceInstance
  extends Model<CryptoBalanceAttributes, CryptoBalanceCreationAttributes>,
    CryptoBalanceAttributes {}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const CryptoBalance = sequelize.define<
    CryptoBalanceInstance,
    CryptoBalanceCreationAttributes
  >(
    "CryptoBalance",
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
      coinId: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      symbol: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      walletAddress: {
        type: dataTypes.STRING,
        allowNull: true,
      },
      quantity: {
        type: dataTypes.DECIMAL(24, 8), // High precision for crypto
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
      tableName: "crypto_balances",
    }
  );

  (CryptoBalance as any).associate = (models: any) => {
    CryptoBalance.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };

  return CryptoBalance;
};
