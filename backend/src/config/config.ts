import { config as appConfig } from "./appConfig";

// Helper to map appConfig.database to Sequelize config format
const db = appConfig.database;

const baseConfig: any = {
  username: db.username,
  password: db.password,
  database: db.database,
  host: db.host,
  port: db.port,
  dialect: db.dialect,
  schema: db.schema,
};

if (db.dialectOptions) {
  baseConfig.dialectOptions = db.dialectOptions;
}

const config = {
  development: { ...baseConfig, logging: console.log },
  test: { ...baseConfig, database: "PaymentServiceDB_test" },
  production: { ...baseConfig, database: "PaymentServiceDB_prod" },
};

// ⚠️ ВАЖНО: экспорт должен быть через `module.exports`, иначе `sequelize-cli` не подхватит
module.exports = config;
