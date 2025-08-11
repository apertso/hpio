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
  startDate: string; // Новое поле
  recurrenceRule: string; // Новое поле вместо pattern
  recurrenceEndDate?: Date | null;
  builtinIconName?: string | null;
  remind: boolean;
  isActive: boolean;
  // New soft field (no migration): boundary to which occurrences are considered generated/consumed
  generatedUntil?: string | null; // DATEONLY-like string, optional for compatibility
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
    | "remind"
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
      startDate: {
        type: dataTypes.DATEONLY,
        allowNull: false,
      },
      recurrenceRule: {
        type: dataTypes.STRING,
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
      remind: {
        type: dataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: dataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      // Soft-added field (sequelize will attempt to add if sync alters; we won't run migrations now)
      generatedUntil: {
        type: dataTypes.DATEONLY,
        allowNull: true,
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
        { fields: ["recurrenceRule"] }, // Индекс по новому полю
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
