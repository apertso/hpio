/**
 * Нормализует объект Date к полуночи по UTC (00:00:00.000Z).
 * Это убирает влияние часового пояса и времени, оставляя только дату.
 * @param date - Исходная дата.
 * @returns Новый объект Date, представляющий полночь по UTC.
 */
export const normalizeDateToUTC = (date: Date): Date => {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
};
