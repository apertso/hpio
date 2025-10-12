import { QueryInterface, DataTypes } from "sequelize";

const migration = {
  async up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    const tableDescription = await queryInterface.describeTable(
      "recurringSeries"
    );

    if (!tableDescription.recurrenceRule) {
      await queryInterface.addColumn("recurringSeries", "recurrenceRule", {
        type: Sequelize.STRING,
        allowNull: true, // Временно разрешаем NULL для миграции данных
      });
    }

    if (!tableDescription.startDate) {
      await queryInterface.addColumn("recurringSeries", "startDate", {
        type: Sequelize.DATEONLY,
        allowNull: true, // Временно разрешаем NULL для миграции данных
      });
    }
  },

  async down(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {},
};

export = migration;
