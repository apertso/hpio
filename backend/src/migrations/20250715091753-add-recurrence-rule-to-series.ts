import { QueryInterface, DataTypes } from "sequelize";

const migration = {
  async up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    await queryInterface.addColumn("recurringSeries", "recurrenceRule", {
      type: Sequelize.STRING,
      allowNull: true, // Временно разрешаем NULL для миграции данных
    });
    await queryInterface.addColumn("recurringSeries", "startDate", {
      type: Sequelize.DATEONLY,
      allowNull: true, // Временно разрешаем NULL для миграции данных
    });
  },

  async down(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {},
};

export = migration;
