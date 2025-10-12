import { config as appConfig } from "./appConfig";

// Helper to map appConfig.database to Sequelize config format
const db = appConfig.database;

const config = {
  development: { ...db, logging: console.log },
  test: { ...db, database: "PaymentServiceDB_test" },
  production: { ...db, database: "PaymentServiceDB_prod" },
};

// ⚠️ ВАЖНО: экспорт должен быть через `module.exports`, иначе `sequelize-cli` не подхватит
module.exports = config;
