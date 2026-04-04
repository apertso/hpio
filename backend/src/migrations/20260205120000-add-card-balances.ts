import { DataTypes, QueryInterface } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const usersTable = { schema: "dbo", tableName: "users" };
    const cardsTable = { schema: "dbo", tableName: "cards" };
    const cardBalancesTable = { schema: "dbo", tableName: "card_balances" };

    await queryInterface.createTable(cardBalancesTable, {
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
      cardId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: cardsTable, key: "id" },
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

    const cardBalanceIndexes = await queryInterface.showIndex(cardBalancesTable);
    const cardBalanceIndexNames = new Set(
      Array.isArray(cardBalanceIndexes)
        ? (cardBalanceIndexes as Array<{ name?: string }>).map(
            (index) => index.name ?? ""
          )
        : []
    );
    if (!cardBalanceIndexNames.has("card_balances_userId_idx")) {
      await queryInterface.addIndex(cardBalancesTable, ["userId"], {
        name: "card_balances_userId_idx",
      });
    }
    if (!cardBalanceIndexNames.has("card_balances_cardId_idx")) {
      await queryInterface.addIndex(cardBalancesTable, ["cardId"], {
        name: "card_balances_cardId_idx",
      });
    }
    if (!cardBalanceIndexNames.has("card_balances_card_currency_uq")) {
      await queryInterface.addIndex(cardBalancesTable, ["cardId", "currency"], {
        name: "card_balances_card_currency_uq",
        unique: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    const cardBalancesTable = { schema: "dbo", tableName: "card_balances" };
    await queryInterface.dropTable(cardBalancesTable);
  },
};
