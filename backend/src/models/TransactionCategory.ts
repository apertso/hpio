import { DataTypes, Sequelize, Model, Optional, ModelStatic } from "sequelize";

interface TransactionCategoryAttributes {
  id: string;
  name: string;
  type: "expense" | "income";
  builtinIconName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TransactionCategoryCreationAttributes
  extends Optional<
    TransactionCategoryAttributes,
    "id" | "createdAt" | "updatedAt" | "builtinIconName" | "type"
  > {}

export interface TransactionCategoryInstance
  extends Model<
      TransactionCategoryAttributes,
      TransactionCategoryCreationAttributes
    >,
    TransactionCategoryAttributes {}

export default (
  sequelize: Sequelize,
  dataTypes: typeof DataTypes
): ModelStatic<TransactionCategoryInstance> => {
  const TransactionCategory = sequelize.define<
    TransactionCategoryInstance,
    TransactionCategoryCreationAttributes
  >(
    "TransactionCategory",
    {
      id: {
        type: dataTypes.UUID,
        defaultValue: dataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: dataTypes.ENUM("expense", "income"),
        allowNull: false,
        defaultValue: "expense",
      },
      builtinIconName: {
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
      tableName: "transaction_categories",
      indexes: [
        {
          unique: true,
          fields: ["name", "type"],
          name: "transactionCategoryUnique",
        },
        { fields: ["type"], name: "transactionCategories_type_idx" },
      ],
    }
  );

  return TransactionCategory;
};
