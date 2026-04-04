import { DataTypes, QueryInterface, QueryTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const usersTable = { schema: "dbo", tableName: "users" };
    const paymentsTable = { schema: "dbo", tableName: "payments" };
    const tagsTable = { schema: "dbo", tableName: "tags" };
    const paymentTagsTable = { schema: "dbo", tableName: "paymentTags" };

    const usersDescription = await queryInterface.describeTable(usersTable);
    if (!Object.prototype.hasOwnProperty.call(usersDescription, "isAdmin")) {
      await queryInterface.addColumn(usersTable, "isAdmin", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    await queryInterface.createTable(tagsTable, {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: usersTable, key: "id" },
        onDelete: "CASCADE",
      },
      name: {
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

    const tagsIndexes = (await queryInterface.showIndex(tagsTable)) as Array<{
      name: string;
    }>;
    const tagsIndexNames = new Set(tagsIndexes.map((index) => index.name));
    if (!tagsIndexNames.has("tags_userId_idx")) {
      await queryInterface.addIndex(tagsTable, ["userId"], {
        name: "tags_userId_idx",
      });
    }
    if (!tagsIndexNames.has("userTagUnique")) {
      await queryInterface.addConstraint(tagsTable, {
        fields: ["userId", "name"],
        type: "unique",
        name: "userTagUnique",
      });
    }

    const paymentIdConstraints = (await queryInterface.sequelize.query(
      `SELECT tc.constraint_type AS "constraintType"
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
        AND tc.constraint_name = kcu.constraint_name
       WHERE tc.table_schema = :schema
         AND tc.table_name = :table
         AND kcu.column_name = :column
         AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')`,
      {
        replacements: {
          schema: paymentsTable.schema,
          table: paymentsTable.tableName,
          column: "id",
        },
        type: QueryTypes.SELECT,
      }
    )) as Array<{ constraintType: string }>;

    if (paymentIdConstraints.length === 0) {
      await queryInterface.addConstraint(paymentsTable, {
        fields: ["id"],
        type: "unique",
        name: "payments_id_unique",
      });
    }

    await queryInterface.createTable(paymentTagsTable, {
      paymentId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: paymentsTable, key: "id" },
        onDelete: "CASCADE",
      },
      tagId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: tagsTable, key: "id" },
        onDelete: "CASCADE",
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

    const paymentTagsIndexes = (await queryInterface.showIndex(
      paymentTagsTable
    )) as Array<{ name: string }>;
    const paymentTagsIndexNames = new Set(
      paymentTagsIndexes.map((index) => index.name)
    );
    if (!paymentTagsIndexNames.has("paymentTags_paymentId_idx")) {
      await queryInterface.addIndex(paymentTagsTable, ["paymentId"], {
        name: "paymentTags_paymentId_idx",
      });
    }
    if (!paymentTagsIndexNames.has("paymentTags_tagId_idx")) {
      await queryInterface.addIndex(paymentTagsTable, ["tagId"], {
        name: "paymentTags_tagId_idx",
      });
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    const usersTable = { schema: "dbo", tableName: "users" };
    const paymentsTable = { schema: "dbo", tableName: "payments" };
    const tagsTable = { schema: "dbo", tableName: "tags" };
    const paymentTagsTable = { schema: "dbo", tableName: "paymentTags" };

    const paymentIdUnique = (await queryInterface.sequelize.query(
      `SELECT tc.constraint_name AS "constraintName"
       FROM information_schema.table_constraints tc
       WHERE tc.table_schema = :schema
         AND tc.table_name = :table
         AND tc.constraint_type = 'UNIQUE'
         AND tc.constraint_name = :constraintName`,
      {
        replacements: {
          schema: "dbo",
          table: "payments",
          constraintName: "payments_id_unique",
        },
        type: QueryTypes.SELECT,
      }
    )) as Array<{ constraintName: string }>;

    await queryInterface.dropTable(paymentTagsTable);
    await queryInterface.dropTable(tagsTable);
    if (paymentIdUnique.length > 0) {
      await queryInterface.removeConstraint(paymentsTable, "payments_id_unique");
    }
    const usersDescription = await queryInterface.describeTable(usersTable);
    if (Object.prototype.hasOwnProperty.call(usersDescription, "isAdmin")) {
      await queryInterface.removeColumn(usersTable, "isAdmin");
    }
  },
};
