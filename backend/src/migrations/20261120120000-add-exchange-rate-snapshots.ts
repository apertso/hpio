import { DataTypes, QueryInterface } from "sequelize";

// Хранилище исторических курсов: переживает перезапуск сервера, чтобы не запрашивать
// у провайдера сотни дат заново при первой загрузке длинного периода.
const table = { schema: "dbo", tableName: "exchange_rate_snapshots" };

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable(table, {
      rateDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        primaryKey: true,
      },
      rates: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable(table);
  },
};
