import { DataTypes, QueryInterface, QueryTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const transactionCategoriesTable = {
      schema: "dbo",
      tableName: "transaction_categories",
    };
    const categoriesTable = { schema: "dbo", tableName: "categories" };
    const userId = "4ee830f4-b207-49a5-9dd5-6d53a7b08267";
    const qualifiedTransactionCategoriesTable = `"${transactionCategoriesTable.schema}"."${transactionCategoriesTable.tableName}"`;
    const qualifiedCategoriesTable = `"${categoriesTable.schema}"."${categoriesTable.tableName}"`;

    const existingTables = (await queryInterface.sequelize.query(
      `SELECT 1 AS existsValue
       FROM information_schema.tables
       WHERE table_schema = :schema
         AND table_name = :table`,
      {
        replacements: {
          schema: transactionCategoriesTable.schema,
          table: transactionCategoriesTable.tableName,
        },
        type: QueryTypes.SELECT,
      }
    )) as Array<{ existsValue: number }>;

    if (!existingTables.length) {
      await queryInterface.createTable(transactionCategoriesTable, {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM("expense", "income"),
          allowNull: false,
          defaultValue: "expense",
        },
        builtinIconName: {
          type: DataTypes.STRING,
          allowNull: true,
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

      await queryInterface.addConstraint(transactionCategoriesTable, {
        fields: ["name", "type"],
        type: "unique",
        name: "transactionCategoryUnique",
      });

      await queryInterface.addIndex(transactionCategoriesTable, ["type"], {
        name: "transactionCategories_type_idx",
      });
    }

    const existingRows = (await queryInterface.sequelize.query(
      `SELECT 1 AS hasRow
       FROM ${qualifiedTransactionCategoriesTable}
       LIMIT 1`,
      { type: QueryTypes.SELECT }
    )) as Array<{ hasRow: number }>;

    if (existingRows.length > 0) {
      return;
    }

    await queryInterface.sequelize.query(
      `INSERT INTO ${qualifiedTransactionCategoriesTable}
        ("id", "name", "type", "builtinIconName", "createdAt", "updatedAt")
       SELECT
         "id",
         "name",
         "type"::text::"${transactionCategoriesTable.schema}"."enum_transaction_categories_type",
         "builtinIconName",
         "createdAt",
         "updatedAt"
       FROM ${qualifiedCategoriesTable}
       WHERE "userId" = :userId`,
      {
        replacements: { userId },
        type: QueryTypes.INSERT,
      }
    );

    const now = new Date();
    const defaultIncomeCategories = [
      { name: "Перевод (Входящий)", icon: "arrow-down" },
      { name: "Пополнение (Нал)", icon: "banknotes" },
      { name: "Возврат", icon: "arrow-path" },
      { name: "Проценты", icon: "receipt-percent" },
      { name: "Бонус", icon: "gift" },
      { name: "Зарплата/Выплата", icon: "briefcase" },
      { name: "Корректировка", icon: "adjustments-horizontal" },
      { name: "Внутренний перевод", icon: "arrows-right-left" },
    ];

    for (const category of defaultIncomeCategories) {
      await queryInterface.sequelize.query(
        `INSERT INTO ${qualifiedTransactionCategoriesTable}
          ("id", "name", "type", "builtinIconName", "createdAt", "updatedAt")
         SELECT gen_random_uuid(), :name, :type, :icon, :createdAt, :updatedAt
         WHERE NOT EXISTS (
           SELECT 1
           FROM ${qualifiedTransactionCategoriesTable}
           WHERE "name" = :name AND "type" = :type
         )`,
        {
          replacements: {
            name: category.name,
            type: "income",
            icon: category.icon,
            createdAt: now,
            updatedAt: now,
          },
          type: QueryTypes.INSERT,
        }
      );
    }
  },

  down: async (_queryInterface: QueryInterface): Promise<void> => {},
};
