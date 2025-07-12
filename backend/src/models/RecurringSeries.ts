import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { UserInstance } from "./User";
import { CategoryInstance } from "./Category";
import { PaymentInstance } from "./Payment";

export interface RecurringSeriesAttributes {
  id: string;
  userId: string;
  title: string;
  amount: number;
  categoryId?: string | null;
  recurrencePattern: "daily" | "weekly" | "monthly" | "yearly";
  recurrenceEndDate?: Date | null;
  builtinIconName?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringSeriesCreationAttributes
  extends Optional<
    RecurringSeriesAttributes,
    | "id"
    | "isActive"
    | "createdAt"
    | "updatedAt"
    | "categoryId"
    | "recurrenceEndDate"
    | "builtinIconName"
  > {}

export interface RecurringSeriesInstance
  extends Model<RecurringSeriesAttributes, RecurringSeriesCreationAttributes>,
    RecurringSeriesAttributes {
  user?: UserInstance;
  category?: CategoryInstance;
  payments?: PaymentInstance[];
}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const RecurringSeries = sequelize.define<RecurringSeriesInstance>(
    "RecurringSeries",
    {
      id: {
        type: dataTypes.UUID,
        defaultValue: dataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: dataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      title: {
        type: dataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: dataTypes.DECIMAL(18, 2),
        allowNull: false,
      },
      categoryId: {
        type: dataTypes.UUID,
        allowNull: true,
        references: {
          model: "categories",
          key: "id",
        },
      },
      recurrencePattern: {
        type: dataTypes.ENUM("daily", "weekly", "monthly", "yearly"),
        allowNull: false,
      },
      recurrenceEndDate: {
        type: dataTypes.DATEONLY,
        allowNull: true,
      },
      builtinIconName: {
        type: dataTypes.STRING,
        allowNull: true,
      },
      isActive: {
        type: dataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      createdAt: {
        type: dataTypes.DATE,
        allowNull: false,
        defaultValue: dataTypes.NOW,
      },
      updatedAt: {
        type: dataTypes.DATE,
        allowNull: false,
        defaultValue: dataTypes.NOW,
      },
    },
    {
      tableName: "recurringSeries",
      // Indexes for query optimization
      indexes: [
        { fields: ["userId"] },
        { fields: ["categoryId"] },
        { fields: ["recurrencePattern"] },
        { fields: ["isActive"] },
      ],
    }
  );

  // Associations
  (RecurringSeries as any).associate = (models: any) => {
    RecurringSeries.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
    RecurringSeries.belongsTo(models.Category, {
      foreignKey: "categoryId",
      as: "category",
    });
    RecurringSeries.hasMany(models.Payment, {
      foreignKey: "seriesId",
      as: "payments",
    });
  };

  return RecurringSeries;
};
