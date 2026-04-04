import { DataTypes, QueryInterface } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const usersTable = { schema: "dbo", tableName: "users" };
    const cashBalancesTable = { schema: "dbo", tableName: "cash_balances" };
    const fundSnapshotsTable = { schema: "dbo", tableName: "fund_snapshots" };

    const usersTableDefinition = await queryInterface.describeTable(usersTable);
    if (!usersTableDefinition.preferredCurrency) {
      await queryInterface.addColumn(usersTable, "preferredCurrency", {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "RUB",
      });
    }

    await queryInterface.createTable(cashBalancesTable, {
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
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.sequelize.query(`
      WITH ranked AS (
        SELECT
          id,
          "userId",
          currency,
          SUM(amount) OVER (PARTITION BY "userId", currency) AS total_amount,
          COUNT(*) OVER (PARTITION BY "userId", currency) AS row_count,
          ROW_NUMBER() OVER (
            PARTITION BY "userId", currency
            ORDER BY "updatedAt" DESC, "createdAt" DESC, id
          ) AS rn
        FROM "dbo"."cash_balances"
      )
      UPDATE "dbo"."cash_balances" AS cb
      SET amount = ranked.total_amount,
          "updatedAt" = NOW()
      FROM ranked
      WHERE cb.id = ranked.id
        AND ranked.row_count > 1
        AND ranked.rn = 1;
    `);

    await queryInterface.sequelize.query(`
      WITH ranked AS (
        SELECT
          id,
          COUNT(*) OVER (PARTITION BY "userId", currency) AS row_count,
          ROW_NUMBER() OVER (
            PARTITION BY "userId", currency
            ORDER BY "updatedAt" DESC, "createdAt" DESC, id
          ) AS rn
        FROM "dbo"."cash_balances"
      )
      DELETE FROM "dbo"."cash_balances" AS cb
      USING ranked
      WHERE cb.id = ranked.id
        AND ranked.row_count > 1
        AND ranked.rn > 1;
    `);

    const cashBalanceIndexes = await queryInterface.showIndex(cashBalancesTable);
    const cashBalanceIndexNames = new Set(
      Array.isArray(cashBalanceIndexes)
        ? (cashBalanceIndexes as Array<{ name?: string }>).map(
            (index) => index.name ?? ""
          )
        : []
    );
    if (!cashBalanceIndexNames.has("cash_balances_userId_idx")) {
      await queryInterface.addIndex(cashBalancesTable, ["userId"], {
        name: "cash_balances_userId_idx",
      });
    }
    if (!cashBalanceIndexNames.has("cash_balances_user_currency_uq")) {
      await queryInterface.addIndex(cashBalancesTable, ["userId", "currency"], {
        name: "cash_balances_user_currency_uq",
        unique: true,
      });
    }

    await queryInterface.createTable(fundSnapshotsTable, {
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
      snapshotDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      totalUsd: {
        type: DataTypes.DECIMAL(18, 2),
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
    const fundSnapshotIndexes = await queryInterface.showIndex(
      fundSnapshotsTable
    );
    const fundSnapshotIndexNames = new Set(
      Array.isArray(fundSnapshotIndexes)
        ? (fundSnapshotIndexes as Array<{ name?: string }>).map(
            (index) => index.name ?? ""
          )
        : []
    );
    if (!fundSnapshotIndexNames.has("fund_snapshots_userId_idx")) {
      await queryInterface.addIndex(fundSnapshotsTable, ["userId"], {
        name: "fund_snapshots_userId_idx",
      });
    }
    if (!fundSnapshotIndexNames.has("fund_snapshots_user_date_uq")) {
      await queryInterface.addIndex(
        fundSnapshotsTable,
        ["userId", "snapshotDate"],
        {
          name: "fund_snapshots_user_date_uq",
          unique: true,
        }
      );
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    const usersTable = { schema: "dbo", tableName: "users" };
    const cashBalancesTable = { schema: "dbo", tableName: "cash_balances" };
    const fundSnapshotsTable = { schema: "dbo", tableName: "fund_snapshots" };

    await queryInterface.dropTable(fundSnapshotsTable);
    await queryInterface.dropTable(cashBalancesTable);
    await queryInterface.removeColumn(usersTable, "preferredCurrency");
  },
};
