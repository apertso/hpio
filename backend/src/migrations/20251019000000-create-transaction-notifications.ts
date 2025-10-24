import { DataTypes, QueryInterface } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("transaction_notifications", {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      from: {
        type: DataTypes.STRING,
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

    await queryInterface.addIndex("transaction_notifications", ["from"]);
    await queryInterface.addIndex("transaction_notifications", ["createdAt"]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("transaction_notifications");
  },
};
