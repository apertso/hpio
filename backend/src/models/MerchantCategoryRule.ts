import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { TransactionCategoryInstance } from "./TransactionCategory";

interface MerchantCategoryRuleAttributes {
  id: string;
  categoryId: string;
  merchantKeyword: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MerchantCategoryRuleCreationAttributes
  extends Optional<
    MerchantCategoryRuleAttributes,
    "id" | "createdAt" | "updatedAt"
  > {}

export interface MerchantCategoryRuleInstance
  extends Model<
      MerchantCategoryRuleAttributes,
      MerchantCategoryRuleCreationAttributes
    >,
    MerchantCategoryRuleAttributes {
  transactionCategory?: TransactionCategoryInstance;
}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const MerchantCategoryRule = sequelize.define<
    MerchantCategoryRuleInstance,
    MerchantCategoryRuleCreationAttributes
  >(
    "MerchantCategoryRule",
    {
      id: {
        type: dataTypes.UUID,
        defaultValue: dataTypes.UUIDV4,
        primaryKey: true,
      },
      categoryId: {
        type: dataTypes.UUID,
        allowNull: false,
        references: {
          model: "transaction_categories",
          key: "id",
        },
      },
      merchantKeyword: {
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
      tableName: "merchantCategoryRules",
      indexes: [
        { fields: ["categoryId"] },
        {
          unique: true,
          fields: ["merchantKeyword"],
          name: "merchantKeywordUnique",
        },
      ],
    }
  );

  (MerchantCategoryRule as any).associate = (models: any) => {
    MerchantCategoryRule.belongsTo(models.TransactionCategory, {
      foreignKey: "categoryId",
      as: "transactionCategory",
      constraints: false,
    });
  };

  return MerchantCategoryRule;
};
