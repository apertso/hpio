import { DataTypes, QueryInterface } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const tableDescription = await queryInterface.describeTable("suggestions");

    if (!tableDescription.notificationTimestamp) {
      await queryInterface.addColumn("suggestions", "notificationTimestamp", {
        type: DataTypes.BIGINT,
        allowNull: true,
      });
    }

    // Check if index exists on the column before adding
    const [indexResults] = (await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_class t ON t.oid = i.indrelid
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
        WHERE t.relname = 'suggestions'
        AND a.attname = 'notificationTimestamp'
        AND c.relkind = 'i'
      ) as exists`
    )) as [Array<{ exists: boolean }>, unknown];

    const indexExists =
      indexResults && indexResults.length > 0 && indexResults[0]?.exists;

    if (!indexExists) {
      await queryInterface.addIndex("suggestions", ["notificationTimestamp"]);
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeIndex("suggestions", ["notificationTimestamp"]);
    await queryInterface.removeColumn("suggestions", "notificationTimestamp");
  },
};
