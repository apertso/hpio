import { DataTypes, Model, Sequelize } from "sequelize";

interface SystemTaskLogAttributes {
  taskName: string;
  lastExecutedAt: Date;
}

export interface SystemTaskLogInstance
  extends Model<SystemTaskLogAttributes, SystemTaskLogAttributes>,
    SystemTaskLogAttributes {}

export default (sequelize: Sequelize) => {
  const SystemTaskLog = sequelize.define<SystemTaskLogInstance>(
    "SystemTaskLog",
    {
      taskName: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      lastExecutedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "systemTaskLogs",
      timestamps: true,
    }
  );

  return SystemTaskLog;
};
