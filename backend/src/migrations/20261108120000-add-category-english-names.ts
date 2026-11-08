import { DataTypes, QueryInterface } from "sequelize";

const englishNames: Record<string, string> = {
  VPS: "VPS",
  Автоуслуги: "Car services",
  Аптеки: "Pharmacies",
  Аренда: "Rent",
  Благотворительность: "Charity",
  "Детские товары": "Kids",
  Заправки: "Gas stations",
  Канцтовары: "Stationery",
  "Комунальные платежи": "Utilities",
  Маркетплейсы: "Marketplaces",
  "Медицина и здоровье": "Healthcare",
  Налоги: "Taxes",
  "Общественный транспорт": "Public transport",
  Одежда: "Clothing",
  Парковки: "Parking",
  "Платёжные сервисы": "Payment services",
  Подарки: "Gifts",
  Подписки: "Subscriptions",
  Продукты: "Groceries",
  Путешествия: "Travel",
  Развлечения: "Entertainment",
  "Рестораны/кафе": "Restaurants and cafes",
  Такси: "Taxi",
  "Товары для дома": "Home goods",
  Услуги: "Services",
  Хозтовары: "Household supplies",
  Чаевые: "Tips",
  Штрафы: "Fines",
  Экскурсии: "Tours",
  Бонус: "Bonus",
  "Внутренний перевод": "Internal transfer",
  Возврат: "Refund",
  "Зарплата/Выплата": "Salary",
  Корректировка: "Adjustment",
  "Перевод (Входящий)": "Incoming transfer",
  "Пополнение (Нал)": "Cash deposit",
  Проценты: "Interest",
};

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const table = { schema: "dbo", tableName: "transaction_categories" };
    const qualifiedTable = `"${table.schema}"."${table.tableName}"`;
    const description = await queryInterface.describeTable(table);

    if (!Object.prototype.hasOwnProperty.call(description, "nameEn")) {
      await queryInterface.addColumn(table, "nameEn", {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    for (const [name, nameEn] of Object.entries(englishNames)) {
      await queryInterface.sequelize.query(
        `UPDATE ${qualifiedTable}
         SET "nameEn" = :nameEn
         WHERE "name" = :name
           AND ("nameEn" IS NULL OR "nameEn" = '')`,
        { replacements: { name, nameEn } }
      );
    }

    await queryInterface.sequelize.query(
      `UPDATE ${qualifiedTable}
       SET "nameEn" = "name"
       WHERE "nameEn" IS NULL OR "nameEn" = ''`
    );

    await queryInterface.changeColumn(table, "nameEn", {
      type: DataTypes.STRING,
      allowNull: false,
    });

    const indexes = await queryInterface.showIndex(table);
    const indexNames = new Set(
      Array.isArray(indexes)
        ? (indexes as Array<{ name?: string }>).map((index) => index.name ?? "")
        : []
    );
    if (!indexNames.has("transactionCategoryNameEnUnique")) {
      await queryInterface.addIndex(table, ["nameEn", "type"], {
        name: "transactionCategoryNameEnUnique",
        unique: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    const table = { schema: "dbo", tableName: "transaction_categories" };
    await queryInterface.removeIndex(table, "transactionCategoryNameEnUnique");
    await queryInterface.removeColumn(table, "nameEn");
  },
};
