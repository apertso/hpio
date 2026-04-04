import { DataTypes, Sequelize, Model, Optional } from "sequelize";

export interface FundSnapshotAttributes {
  id: string;
  userId: string;
  snapshotDate: string;
  totalUsd: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FundSnapshotCreationAttributes
  extends Optional<FundSnapshotAttributes, "id" | "createdAt" | "updatedAt"> {}

export interface FundSnapshotInstance
  extends Model<FundSnapshotAttributes, FundSnapshotCreationAttributes>,
    FundSnapshotAttributes {}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const FundSnapshot = sequelize.define<
    FundSnapshotInstance,
    FundSnapshotCreationAttributes
  >(
    "FundSnapshot",
    {
      id: {
        type: dataTypes.UUID,
        defaultValue: dataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: dataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      snapshotDate: {
        type: dataTypes.DATEONLY,
        allowNull: false,
      },
      totalUsd: {
        type: dataTypes.DECIMAL(18, 2),
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
      tableName: "fund_snapshots",
    }
  );

  (FundSnapshot as any).associate = (models: any) => {
    FundSnapshot.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };

  return FundSnapshot;
};
