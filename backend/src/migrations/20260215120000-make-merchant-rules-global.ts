import { DataTypes, QueryInterface } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const table = { tableName: "merchantCategoryRules", schema: "dbo" };
    const tableName = `"${table.schema}"."${table.tableName}"`;
    const columns = await queryInterface.describeTable(table);

    await queryInterface.sequelize.query(
      `ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS "userMerchantUnique"`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS "${table.schema}"."merchantCategoryRules_userId"`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS "${table.schema}"."merchantCategoryRules_merchantKeyword"`
    );
    if (columns.userId) {
      await queryInterface.removeColumn(table, "userId");
    }
    await queryInterface.addConstraint(table, {
      fields: ["merchantKeyword"],
      type: "unique",
      name: "merchantKeywordUnique",
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    const table = { tableName: "merchantCategoryRules", schema: "dbo" };
    const tableName = `"${table.schema}"."${table.tableName}"`;
    const columns = await queryInterface.describeTable(table);

    await queryInterface.sequelize.query(
      `ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS "merchantKeywordUnique"`
    );
    if (!columns.userId) {
      await queryInterface.addColumn(table, "userId", {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: { tableName: "users", schema: "dbo" },
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
      });
    }
    await queryInterface.addIndex(table, ["userId"]);
    await queryInterface.addIndex(table, ["merchantKeyword"]);
    await queryInterface.addConstraint(table, {
      fields: ["userId", "merchantKeyword"],
      type: "unique",
      name: "userMerchantUnique",
    });
  },
};
