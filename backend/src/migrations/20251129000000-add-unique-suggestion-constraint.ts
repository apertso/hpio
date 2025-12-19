import { QueryInterface } from "sequelize";

const CONSTRAINT_NAME = "suggestions_unique_notification";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Проверяем, существует ли уже индекс
    const [constraintResults] = (await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = '${CONSTRAINT_NAME}'
        AND n.nspname = 'dbo'
        AND c.relkind = 'i'
      ) as exists`
    )) as [Array<{ exists: boolean }>, unknown];

    const constraintExists =
      constraintResults &&
      constraintResults.length > 0 &&
      constraintResults[0]?.exists;

    if (!constraintExists) {
      // Удаляем существующие дубликаты, оставляя только самую старую запись в каждой группе
      await queryInterface.sequelize.query(
        `DELETE FROM dbo.suggestions
         WHERE id IN (
           SELECT id FROM (
             SELECT id,
                    ROW_NUMBER() OVER (
                      PARTITION BY "userId", COALESCE("notificationTimestamp", 0), "notificationData"
                      ORDER BY "createdAt" ASC
                    ) as rn
             FROM dbo.suggestions
             WHERE "notificationData" IS NOT NULL
           ) sub
           WHERE rn > 1
         )`
      );

      // Создаём уникальный индекс вместо constraint для поддержки NULL значений
      // PostgreSQL не считает NULL = NULL, поэтому partial unique index не сработает
      // Используем COALESCE для обработки NULL в notificationTimestamp
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX "${CONSTRAINT_NAME}"
         ON dbo.suggestions ("userId", COALESCE("notificationTimestamp", 0), "notificationData")
         WHERE "notificationData" IS NOT NULL`
      );
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS dbo."${CONSTRAINT_NAME}"`
    );
  },
};
