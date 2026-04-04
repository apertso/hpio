import { DataTypes, Sequelize, Model, ModelStatic, Optional } from "sequelize";

interface TagAttributes {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TagCreationAttributes
  extends Optional<TagAttributes, "id" | "createdAt" | "updatedAt"> {}

export interface TagInstance
  extends Model<TagAttributes, TagCreationAttributes>,
    TagAttributes {}

type TagAssociateModels = {
  User: ModelStatic<Model>;
  Payment: ModelStatic<Model>;
  PaymentTag: ModelStatic<Model>;
};

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const Tag = sequelize.define<TagInstance, TagCreationAttributes>(
    "Tag",
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
      name: {
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
      tableName: "tags",
      indexes: [
        {
          unique: true,
          fields: ["userId", "name"],
          name: "userTagUnique",
        },
        { fields: ["userId"] },
      ],
    }
  );

  (Tag as unknown as { associate?: (models: TagAssociateModels) => void }).associate =
    (models: TagAssociateModels) => {
      Tag.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });
      Tag.belongsToMany(models.Payment, {
        through: models.PaymentTag,
        foreignKey: "tagId",
        otherKey: "paymentId",
        as: "payments",
      });
    };

  return Tag;
};
