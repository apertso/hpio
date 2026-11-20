import { DataTypes, Sequelize, Model, Optional } from "sequelize";

/** Снимок курсов валют к USD на конкретную дату (данные провайдера за прошедший день неизменны). */
export interface ExchangeRateSnapshotAttributes {
  rateDate: string;
  /** JSON-строка вида {"usd":1,"eur":0.92,...}: TEXT вместо JSONB, чтобы не зависеть от диалекта. */
  rates: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExchangeRateSnapshotCreationAttributes
  extends Optional<ExchangeRateSnapshotAttributes, "createdAt" | "updatedAt"> {}

export interface ExchangeRateSnapshotInstance
  extends Model<ExchangeRateSnapshotAttributes, ExchangeRateSnapshotCreationAttributes>,
    ExchangeRateSnapshotAttributes {}

export default (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  return sequelize.define<ExchangeRateSnapshotInstance, ExchangeRateSnapshotCreationAttributes>(
    "ExchangeRateSnapshot",
    {
      rateDate: {
        type: dataTypes.DATEONLY,
        allowNull: false,
        primaryKey: true,
      },
      rates: {
        type: dataTypes.TEXT,
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
      tableName: "exchange_rate_snapshots",
    }
  );
};
