import { DataTypes, QueryInterface } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const categoriesTable = { schema: "dbo", tableName: "categories" };
    const cardsTable = { schema: "dbo", tableName: "cards" };
    const incomesTable = { schema: "dbo", tableName: "incomes" };
    const paymentsTable = { schema: "dbo", tableName: "payments" };
    const usersTable = { schema: "dbo", tableName: "users" };

    // 1. Update Categories: Add 'type' column
    await queryInterface.addColumn(categoriesTable, "type", {
      type: DataTypes.ENUM("expense", "income"),
      allowNull: false,
      defaultValue: "expense",
    });

    // 2. Create Cards Table
    await queryInterface.createTable(cardsTable, {
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
      name: { type: DataTypes.STRING, allowNull: false },
      pan: { type: DataTypes.STRING, allowNull: true },
      bankName: { type: DataTypes.STRING, allowNull: true },
      country: { type: DataTypes.STRING(2), allowNull: true },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "RUB",
      },
      balance: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      type: { type: DataTypes.STRING, allowNull: true },
      vendor: { type: DataTypes.STRING, allowNull: true },
      level: { type: DataTypes.STRING, allowNull: true },
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
    await queryInterface.addIndex(cardsTable, ["userId"], {
      name: "cards_userId_idx",
    });

    // 3. Create Incomes Table
    await queryInterface.createTable(incomesTable, {
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
      categoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: categoriesTable, key: "id" },
        onDelete: "SET NULL",
      },
      cardId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: cardsTable, key: "id" },
        onDelete: "SET NULL",
      },
      amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "RUB",
      },
      exchangeRate: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: false,
        defaultValue: 1.0,
      },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      method: {
        type: DataTypes.ENUM("cash", "card", "transfer", "other"),
        allowNull: false,
        defaultValue: "cash",
      },
      comment: { type: DataTypes.TEXT, allowNull: true },
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
    await queryInterface.addIndex(incomesTable, ["userId"], {
      name: "incomes_userId_idx",
    });
    await queryInterface.addIndex(incomesTable, ["date"], {
      name: "incomes_date_idx",
    });

    // 4. Update Payments: Add currency, exchangeRate, cardId, method
    await queryInterface.addColumn(paymentsTable, "currency", {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "RUB",
    });
    await queryInterface.addColumn(paymentsTable, "exchangeRate", {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      defaultValue: 1.0,
    });
    await queryInterface.addColumn(paymentsTable, "cardId", {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: cardsTable, key: "id" },
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn(paymentsTable, "method", {
      type: DataTypes.ENUM("cash", "card", "transfer", "other"),
      allowNull: false,
      defaultValue: "cash",
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    const categoriesTable = { schema: "dbo", tableName: "categories" };
    const cardsTable = { schema: "dbo", tableName: "cards" };
    const incomesTable = { schema: "dbo", tableName: "incomes" };
    const paymentsTable = { schema: "dbo", tableName: "payments" };

    await queryInterface.removeColumn(paymentsTable, "method");
    await queryInterface.removeColumn(paymentsTable, "cardId");
    await queryInterface.removeColumn(paymentsTable, "exchangeRate");
    await queryInterface.removeColumn(paymentsTable, "currency");
    await queryInterface.dropTable(incomesTable);
    await queryInterface.dropTable(cardsTable);
    await queryInterface.removeColumn(categoriesTable, "type");
  },
};
