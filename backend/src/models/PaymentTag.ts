import { DataTypes, Sequelize, Model, Optional } from "sequelize";

interface PaymentTagAttributes {
  paymentId: string;
  tagId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PaymentTagCreationAttributes
  extends Optional<PaymentTagAttributes, "createdAt" | "updatedAt"> {}

export interface PaymentTagInstance
  extends Model<PaymentTagAttributes, PaymentTagCreationAttributes>,
    PaymentTagAttributes {}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const PaymentTag = sequelize.define<PaymentTagInstance, PaymentTagCreationAttributes>(
    "PaymentTag",
    {
      paymentId: {
        type: dataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "payments",
          key: "id",
        },
      },
      tagId: {
        type: dataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "tags",
          key: "id",
        },
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
      tableName: "paymentTags",
    }
  );

  return PaymentTag;
};
