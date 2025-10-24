import { DataTypes, Model, Optional, Sequelize } from "sequelize";

interface TransactionNotificationAttributes {
  id: string;
  text: string;
  from: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TransactionNotificationCreationAttributes
  extends Optional<
    TransactionNotificationAttributes,
    "id" | "createdAt" | "updatedAt"
  > {}

export interface TransactionNotificationInstance
  extends Model<
      TransactionNotificationAttributes,
      TransactionNotificationCreationAttributes
    >,
    TransactionNotificationAttributes {}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const TransactionNotification = sequelize.define<
    TransactionNotificationInstance,
    TransactionNotificationCreationAttributes
  >(
    "TransactionNotification",
    {
      id: {
        type: dataTypes.UUID,
        defaultValue: dataTypes.UUIDV4,
        primaryKey: true,
      },
      text: {
        type: dataTypes.TEXT,
        allowNull: false,
      },
      from: {
        type: dataTypes.STRING,
        allowNull: false,
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
      tableName: "transaction_notifications",
      indexes: [
        { fields: ["from"], unique: false },
        { fields: ["createdAt"], unique: false },
      ],
    }
  );

  return TransactionNotification;
};
