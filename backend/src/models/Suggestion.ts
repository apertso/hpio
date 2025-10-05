import { DataTypes, Model, Optional, Sequelize } from "sequelize";

interface SuggestionAttributes {
  id: string;
  userId: string;
  merchantName: string;
  amount: number;
  notificationData: string;
  status: "pending" | "accepted" | "dismissed";
  createdAt: Date;
  updatedAt: Date;
}

interface SuggestionCreationAttributes
  extends Optional<
    SuggestionAttributes,
    "id" | "status" | "createdAt" | "updatedAt"
  > {}

export interface SuggestionInstance
  extends Model<SuggestionAttributes, SuggestionCreationAttributes>,
    SuggestionAttributes {}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const Suggestion = sequelize.define<
    SuggestionInstance,
    SuggestionCreationAttributes
  >(
    "Suggestion",
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
        onDelete: "CASCADE",
      },
      merchantName: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: dataTypes.DECIMAL(18, 2),
        allowNull: false,
      },
      notificationData: {
        type: dataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: dataTypes.ENUM("pending", "accepted", "dismissed"),
        defaultValue: "pending",
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
      tableName: "suggestions",
      indexes: [
        { fields: ["userId"] },
        { fields: ["status"] },
        { fields: ["createdAt"] },
      ],
    }
  );

  (Suggestion as any).associate = (models: any) => {
    Suggestion.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return Suggestion;
};
