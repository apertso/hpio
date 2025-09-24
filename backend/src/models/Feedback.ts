import { DataTypes, Model, Optional, Sequelize } from "sequelize";

interface FeedbackAttributes {
  id: string;
  userId: string;
  description: string;
  attachmentPath?: string | null;
  status: "new" | "reviewed" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

interface FeedbackCreationAttributes
  extends Optional<
    FeedbackAttributes,
    "id" | "attachmentPath" | "status" | "createdAt" | "updatedAt"
  > {}

export interface FeedbackInstance
  extends Model<FeedbackAttributes, FeedbackCreationAttributes>,
    FeedbackAttributes {}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const Feedback = sequelize.define<
    FeedbackInstance,
    FeedbackCreationAttributes
  >(
    "Feedback",
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
      description: {
        type: dataTypes.TEXT,
        allowNull: false,
      },
      attachmentPath: {
        type: dataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: dataTypes.ENUM("new", "reviewed", "closed"),
        allowNull: false,
        defaultValue: "new",
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
      tableName: "feedback",
      indexes: [{ fields: ["userId"], unique: false }],
    }
  );

  (Feedback as any).associate = (models: any) => {
    Feedback.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return Feedback;
};
