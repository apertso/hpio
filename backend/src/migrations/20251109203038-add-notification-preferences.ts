import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Check if columns already exist (migration was partially run)
    const tableDescription = await queryInterface.describeTable("users");

    if (!tableDescription.emailNotifications) {
      await queryInterface.addColumn("users", "emailNotifications", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!tableDescription.pushNotifications) {
      await queryInterface.addColumn("users", "pushNotifications", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    // Migrate existing data from notificationMethod
    await queryInterface.sequelize.query(`
      UPDATE "dbo"."users"
      SET
        "emailNotifications" = CASE
          WHEN "notificationMethod" = 'email' THEN true
          WHEN "notificationMethod" = 'push' THEN false
          WHEN "notificationMethod" = 'none' THEN false
          ELSE true
        END,
        "pushNotifications" = CASE
          WHEN "notificationMethod" = 'push' THEN true
          WHEN "notificationMethod" = 'email' THEN false
          WHEN "notificationMethod" = 'none' THEN false
          ELSE false
        END
    `);

    // Remove the old notificationMethod column
    if (tableDescription.notificationMethod) {
      await queryInterface.removeColumn("users", "notificationMethod");
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Add back the notificationMethod column
    await queryInterface.addColumn("users", "notificationMethod", {
      type: DataTypes.ENUM("email", "push", "none"),
      allowNull: false,
      defaultValue: "email",
    });

    // Migrate data back to notificationMethod
    await queryInterface.sequelize.query(`
      UPDATE "dbo"."users"
      SET "notificationMethod" = CASE
        WHEN "emailNotifications" = true AND "pushNotifications" = false THEN 'email'
        WHEN "emailNotifications" = false AND "pushNotifications" = true THEN 'push'
        WHEN "emailNotifications" = true AND "pushNotifications" = true THEN 'email'
        WHEN "emailNotifications" = false AND "pushNotifications" = false THEN 'none'
        ELSE 'email'
      END
    `);

    // Remove the new columns
    await queryInterface.removeColumn("users", "emailNotifications");
    await queryInterface.removeColumn("users", "pushNotifications");
  },
};
