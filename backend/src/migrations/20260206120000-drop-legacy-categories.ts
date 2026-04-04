import {
  AddForeignKeyConstraintOptions,
  DataTypes,
  QueryInterface,
  QueryTypes,
} from "sequelize";

type TableRef = { schema: string; tableName: string };

type ForeignKeyConfig = {
  table: TableRef;
  column: string;
  constraintName: string;
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
  onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
};

const fetchForeignKeyConstraints = async (
  queryInterface: QueryInterface,
  table: TableRef,
  column: string
): Promise<string[]> => {
  const rows = (await queryInterface.sequelize.query(
    `SELECT tc.constraint_name AS "constraintName"
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
     WHERE tc.table_schema = :schema
       AND tc.table_name = :table
       AND tc.constraint_type = 'FOREIGN KEY'
       AND kcu.column_name = :column`,
    {
      replacements: {
        schema: table.schema,
        table: table.tableName,
        column,
      },
      type: QueryTypes.SELECT,
    }
  )) as Array<{ constraintName: string }>;

  return rows.map((row) => row.constraintName);
};

const replaceForeignKey = async (
  queryInterface: QueryInterface,
  config: ForeignKeyConfig,
  targetTable: TableRef
): Promise<void> => {
  const existingConstraints = await fetchForeignKeyConstraints(
    queryInterface,
    config.table,
    config.column
  );

  for (const constraintName of existingConstraints) {
    await queryInterface.removeConstraint(config.table, constraintName);
  }

  const constraintOptions: AddForeignKeyConstraintOptions = {
    fields: [config.column],
    type: "foreign key",
    name: config.constraintName,
    references: { table: targetTable, field: "id" },
    onDelete: config.onDelete ?? "NO ACTION",
    onUpdate: config.onUpdate ?? "NO ACTION",
  };

  await queryInterface.addConstraint(config.table, constraintOptions);
};

const hasTable = async (
  queryInterface: QueryInterface,
  table: TableRef
): Promise<boolean> => {
  const rows = (await queryInterface.sequelize.query(
    `SELECT 1 AS existsValue
     FROM information_schema.tables
     WHERE table_schema = :schema
       AND table_name = :table`,
    {
      replacements: {
        schema: table.schema,
        table: table.tableName,
      },
      type: QueryTypes.SELECT,
    }
  )) as Array<{ existsValue: number }>;

  return rows.length > 0;
};

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const schema = "dbo";
    const transactionCategoriesTable = {
      schema,
      tableName: "transaction_categories",
    };
    const categoriesTable = { schema, tableName: "categories" };

    const foreignKeys: ForeignKeyConfig[] = [
      {
        table: { schema, tableName: "payments" },
        column: "categoryId",
        constraintName: "payments_categoryId_fkey",
        onDelete: "SET NULL",
      },
      {
        table: { schema, tableName: "recurringSeries" },
        column: "categoryId",
        constraintName: "recurringSeries_categoryId_fkey",
        onDelete: "SET NULL",
      },
      {
        table: { schema, tableName: "merchantCategoryRules" },
        column: "categoryId",
        constraintName: "merchantCategoryRules_categoryId_fkey",
        onDelete: "CASCADE",
      },
    ];

    for (const config of foreignKeys) {
      await replaceForeignKey(queryInterface, config, transactionCategoriesTable);
    }

    if (await hasTable(queryInterface, categoriesTable)) {
      await queryInterface.dropTable(categoriesTable);
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    const schema = "dbo";
    const categoriesTable = { schema, tableName: "categories" };
    const transactionCategoriesTable = {
      schema,
      tableName: "transaction_categories",
    };

    if (!(await hasTable(queryInterface, categoriesTable))) {
      await queryInterface.createTable(categoriesTable, {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: { tableName: "users", schema },
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
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

      await queryInterface.addIndex(categoriesTable, ["userId"], {
        name: "categories_userId_idx",
      });
      await queryInterface.addConstraint(categoriesTable, {
        fields: ["userId", "name"],
        type: "unique",
        name: "userCategoryUnique",
      });
    }

    const foreignKeys: ForeignKeyConfig[] = [
      {
        table: { schema, tableName: "payments" },
        column: "categoryId",
        constraintName: "payments_categoryId_fkey",
        onDelete: "SET NULL",
      },
      {
        table: { schema, tableName: "recurringSeries" },
        column: "categoryId",
        constraintName: "recurringSeries_categoryId_fkey",
        onDelete: "SET NULL",
      },
      {
        table: { schema, tableName: "merchantCategoryRules" },
        column: "categoryId",
        constraintName: "merchantCategoryRules_categoryId_fkey",
        onDelete: "CASCADE",
      },
    ];

    for (const config of foreignKeys) {
      await replaceForeignKey(queryInterface, config, categoriesTable);
    }

    void transactionCategoriesTable;
  },
};
