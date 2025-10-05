import { DataTypes, Model, Optional, Sequelize } from "sequelize";

interface MerchantCategoryRuleAttributes {
  id: string;
  userId: string;
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
    MerchantCategoryRuleAttributes {}

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
      userId: {
        type: dataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      categoryId: {
        type: dataTypes.UUID,
        allowNull: false,
        references: {
          model: "categories",
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
        { fields: ["userId"] },
        { fields: ["categoryId"] },
        { fields: ["merchantKeyword"] },
        {
          unique: true,
          fields: ["userId", "merchantKeyword"],
          name: "userMerchantUnique",
        },
      ],
    }
  );

  (MerchantCategoryRule as any).associate = (models: any) => {
    MerchantCategoryRule.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
    MerchantCategoryRule.belongsTo(models.Category, {
      foreignKey: "categoryId",
      as: "category",
    });
  };

  return MerchantCategoryRule;
};
