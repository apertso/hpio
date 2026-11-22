import db from "../models";
import { ExchangeRates, getUsdRates, getUsdRatesForDates } from "./exchangeRateService";
import { calculateDashboardStats, getRateDate, StatsPayment } from "./dashboardStats";
import { getIncomesForPeriod } from "./incomeService";
import { Op, Sequelize, WhereAttributeHash, WhereOptions } from "sequelize";
import logger from "../config/logger";
import { deleteFileFromFS } from "./fileService";
import { PaymentInstance, PaymentAttributes } from "../models/Payment";
import { TransactionCategoryInstance } from "../models/TransactionCategory";
import { RRule } from "rrule";
import { normalizeDateToUTC } from "../utils/dateUtils";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { config } from "../config/appConfig";
import {
  createRecurringSeries,
  SeriesModel,
  getActiveRecurringSeries,
  getActiveRecurringSeriesWithCategory,
  getRecurringSeriesById,
  getRecurringSeriesByIdInternal,
  getAllActiveRecurringSeries,
  updateSeriesGeneratedUntil,
  deactivateSeries,
  activateSeries,
  deleteOrphanedSeries,
  calculateNextDueDateForSeries,
  processSeriesAfterPaymentCompletion,
} from "./seriesService";
import {
  TagModel,
  ensureTagsExist,
  attachPaymentTags,
  replacePaymentTags,
} from "./tagService";

// У серии нет валюты: источником служит последний сохранённый платёж.
const loadSeriesCurrencies = async (
  userId: string,
  seriesIds: string[],
  currencies: Map<string, string>
): Promise<void> => {
  if (seriesIds.length === 0) return;
  const payments = await db.Payment.findAll({
    where: { userId, seriesId: { [Op.in]: seriesIds } },
    attributes: ["seriesId", "currency"],
    order: [["dueDate", "DESC"], ["createdAt", "DESC"]],
  });
  const seen = new Set<string>();
  for (const payment of payments) {
    if (payment.seriesId && !seen.has(payment.seriesId)) {
      currencies.set(payment.seriesId, normalizePaymentCurrency(payment.currency));
      seen.add(payment.seriesId);
    }
  }
};

const NO_CATEGORY_FILTER_VALUE = "__NO_CATEGORY__";

const normalizePaymentCurrency = (value: unknown): string => {
  if (typeof value !== "string") {
    return "RUB";
  }
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "RUB";
};

const normalizeTagIds = (tagIds: unknown): string[] => {
  if (!Array.isArray(tagIds)) {
    return [];
  }
  const uniqueIds = new Set<string>();
  tagIds.forEach((tagId) => {
    if (typeof tagId === "string" && tagId.trim()) {
      uniqueIds.add(tagId);
    }
  });
  return Array.from(uniqueIds);
};


// Пример интерфейса для данных платежа (опционально, для строгой типизации)
interface PaymentData {
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  categoryId?: string | null; // Allow null for category
  tagIds?: string[];
  remind?: boolean;
  // Fields for creating a new recurring series (only used during creation)
  recurrenceRule?: string; // Новое поле для RRULE
  recurrenceEndDate?: string; // YYYY-MM-DD string for input
  // Fields for files and icons (handled by fileService/icon logic)
  filePath?: string | null;
  fileName?: string | null;
  builtinIconName?: string | null;
  // Option to create a completed payment immediately (used during creation)
  createAsCompleted?: boolean;
  autoCreated?: boolean;
  completedAt?: string | Date | null;
  currency?: string;
  // seriesId is not part of input data for create/update payment instance
}

export interface PaymentFilterParams {
  status?: string;
  search?: string;
  categoryId?: string;
  isRecurring?: "true" | "false";
  hasFile?: "true" | "false";
  /** Добавить пропущенные периоды просроченных серий виртуальными платежами */
  includeMissed?: boolean;
}

const getWhereWithSearch = (
  where: WhereOptions<PaymentAttributes>,
  search: string | undefined
): WhereOptions<PaymentAttributes> => {
  if (typeof search === "string" && search.trim()) {
    const searchTerm = search.trim();
    const isNumeric = /^-?(\d+(\.\d*)?|\.\d+)$/.test(searchTerm);

    if (isNumeric) {
      return {
        ...where,
        [Op.or]: [
          { title: { [Op.iLike]: `%${searchTerm}%` } },
          Sequelize.where(
            Sequelize.cast(Sequelize.col("Payment.amount"), "text"),
            { [Op.iLike]: `%${searchTerm}%` }
          ),
        ],
      };
    } else {
      return { ...where, title: { [Op.iLike]: `%${searchTerm}%` } };
    }
  }
  return where;
};

export const updatePaymentsCategoryByMerchant = async (
  merchantName: string,
  categoryId: string
): Promise<number> => {
  try {
    const [updatedCount] = await db.Payment.update(
      { categoryId },
      { where: { title: merchantName } }
    );
    logger.info(
      `Updated ${updatedCount} payments for merchant ${merchantName} with category ${categoryId}`
    );
    return updatedCount;
  } catch (error) {
    logger.error(
      `Error updating payments for merchant ${merchantName}:`,
      error
    );
    throw new Error("Не удалось обновить платежи по мерчанту.");
  }
};

export const getUncategorizedAutoCreatedMerchants = async (): Promise<
  { merchantName: string; count: number }[]
> => {
  try {
    const rows = (await db.Payment.findAll({
      attributes: [
        "title",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
      ],
      where: {
        autoCreated: true,
        categoryId: null,
      },
      group: ["title"],
      order: [[Sequelize.fn("COUNT", Sequelize.col("id")), "DESC"]],
      raw: true,
    })) as unknown as Array<{ title: string; count: string | number }>;

    return rows
      .map((row) => ({
        merchantName: String(row.title),
        count: Number(row.count),
      }))
      .filter((row) => row.merchantName.trim());
  } catch (error) {
    logger.error("Error fetching uncategorized auto-created merchants:", error);
    throw new Error("Не удалось получить мерчантов без категории.");
  }
};

// --- Функции для горизонтальной ленты и полного списка ---

// Предел пропущенных периодов одной серии, которые показываем и закрываем за раз
const MAX_MISSED_OCCURRENCES = 1000;

// Дата YYYY-MM-DD по часам сервера — так же сравниваются даты при смене статуса на overdue
const toServerDateString = (date: Date): string =>
  normalizeDateToUTC(date).toISOString().slice(0, 10);

// Значение DATEONLY-поля (строка или Date) в виде YYYY-MM-DD
const toDateOnlyString = (value: unknown): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

/**
 * Пропущенные периоды просроченных серий в виде виртуальных платежей.
 * У серии в БД хранится только самый старый неоплаченный экземпляр; периоды после него
 * и до сегодняшнего дня возвращаем виртуальными со статусом overdue.
 */
const buildMissedOccurrences = async (
  userId: string,
  payments: PaymentInstance[]
): Promise<Record<string, unknown>[]> => {
  const todayStr = toServerDateString(new Date());
  // Реальный просроченный платеж по каждой серии
  const overdueBySeries = new Map<string, PaymentInstance>();
  const existingDatesBySeries = new Map<string, Set<string>>();
  for (const p of payments) {
    if (!p.seriesId) continue;
    const dueStr = String(p.dueDate);
    if (!existingDatesBySeries.has(p.seriesId)) {
      existingDatesBySeries.set(p.seriesId, new Set<string>());
    }
    existingDatesBySeries.get(p.seriesId)!.add(dueStr);
    if (
      (p.status === "overdue" || p.status === "upcoming") &&
      dueStr < todayStr &&
      !overdueBySeries.has(p.seriesId)
    ) {
      overdueBySeries.set(p.seriesId, p);
    }
  }
  if (overdueBySeries.size === 0) return [];

  const seriesList = await getActiveRecurringSeries(userId);
  const missed: Record<string, unknown>[] = [];
  for (const series of seriesList) {
    const overduePayment = overdueBySeries.get(series.id);
    if (!overduePayment || !series.recurrenceRule) continue;
    try {
      // Начинаем со следующего дня после границы генерации (не раньше просроченного платежа)
      const boundaryStr = [series.generatedUntil, toDateOnlyString(overduePayment.dueDate)]
        .filter((v): v is string => Boolean(v))
        .map(toDateOnlyString)
        .sort()
        .pop()!;
      const start = new Date(boundaryStr);
      start.setUTCDate(start.getUTCDate() + 1);
      const yesterday = new Date(`${todayStr}T00:00:00.000Z`);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      if (start > yesterday) continue;

      const options = RRule.parseString(series.recurrenceRule);
      options.dtstart = normalizeDateToUTC(new Date(series.startDate));
      const hits = new RRule(options).between(start, yesterday, true);
      const endStr = series.recurrenceEndDate
        ? toDateOnlyString(series.recurrenceEndDate)
        : null;
      const existing = existingDatesBySeries.get(series.id) ?? new Set<string>();

      let count = 0;
      for (const d of hits) {
        const dStr = d.toISOString().slice(0, 10);
        if (existing.has(dStr) || (endStr && dStr > endStr)) continue;
        if (count >= MAX_MISSED_OCCURRENCES) {
          logger.warn(
            `Series ${series.id} has more than ${MAX_MISSED_OCCURRENCES} missed occurrences; list truncated`
          );
          break;
        }
        count++;
        missed.push({
          id: `virtual:${series.id}:${dStr}`,
          userId,
          title: series.title,
          amount: Number(series.amount),
          dueDate: dStr,
          status: "overdue",
          remind: series.remind,
          seriesId: series.id,
          categoryId: overduePayment.categoryId,
          builtinIconName: series.builtinIconName,
          currency: normalizePaymentCurrency(overduePayment.currency),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isVirtual: true,
          series: {
            id: series.id,
            title: series.title,
            amount: Number(series.amount),
            recurrenceRule: series.recurrenceRule,
            recurrenceEndDate: series.recurrenceEndDate,
            builtinIconName: series.builtinIconName,
            isActive: series.isActive,
          },
        });
      }
    } catch (e) {
      logger.warn(`Failed to compute missed occurrences for series ${series.id}`, e);
    }
  }
  return missed;
};

// Получить активные предстоящие платежи для горизонтальной ленты (2.2)
// Включает upcoming и overdue
export const getUpcomingPayments = async (
  userId: string,
  days: number
): Promise<PaymentInstance[]> => {
  try {
    const now = new Date();
    // Устанавливаем время на полночь для сравнения только дат
    now.setHours(0, 0, 0, 0);

    // Получаем платежи пользователя со статусом 'upcoming' ИЛИ 'overdue'
    // Сортируем по дате срока оплаты по возрастанию
    // Calculate the date N days from now
    const daysFromNow = new Date(now);
    daysFromNow.setDate(now.getDate() + days);
    // Set time to end of the day for inclusive comparison
    daysFromNow.setHours(23, 59, 59, 999);

    const payments = await db.Payment.findAll({
      where: {
        userId: userId,
        status: {
          [Op.in]: ["upcoming", "overdue"], // Включаем предстоящие и просроченные
        },
        dueDate: {
          // Filter by due date within the next N days
          [Op.lte]: daysFromNow,
        },
      },
      order: [["dueDate", "ASC"]],
      include: [
        {
          model: db.TransactionCategory,
          as: "transactionCategory",
          attributes: ["id", "name", "nameEn", "builtinIconName"],
        },
        {
          model: SeriesModel,
          as: "series",
          attributes: [
            "id",
            "title",
            "amount",
            "recurrenceRule",
            "recurrenceEndDate",
            "builtinIconName",
            "isActive",
            "generatedUntil",
          ],
        },
      ],
    });

    logger.info(
      `Fetched ${payments.length} upcoming/overdue payments for user ${userId} for the next ${days} days`
    );
    // --- Виртуальные платежи: добавляем отображение будущих экземпляров серий без записи в БД ---
    // Строим индекс существующих дат по сериям, чтобы не дублировать реальными платежами
    const existingDatesBySeries = new Map<string, Set<string>>();
    const currencyBySeries = new Map<string, string>();
    for (const p of payments as any[]) {
      const seriesId: string | null = (p as any).seriesId || null;
      if (!seriesId) continue;
      const dueStr: string = String(p.dueDate);
      if (!existingDatesBySeries.has(seriesId)) {
        existingDatesBySeries.set(seriesId, new Set<string>());
      }
      existingDatesBySeries.get(seriesId)!.add(dueStr);
      if (p.currency) {
        currencyBySeries.set(seriesId, normalizePaymentCurrency(p.currency));
      }
    }

    // Границы окна отбора
    const windowStart = new Date(now);
    const windowEnd = new Date(daysFromNow);
    const todayStr = toServerDateString(now);

    // Серии, у которых есть реальный просроченный платеж. У такой серии в БД хранится
    // только самый старый пропущенный экземпляр, поэтому пропущенные после него
    // периоды (до сегодняшнего дня) показываем виртуальными просроченными платежами,
    // чтобы сумма к оплате соответствовала действительности.
    const overdueSeriesIds = new Set<string>();
    for (const p of payments) {
      if (!p.seriesId) continue;
      if (p.status === "overdue" || String(p.dueDate) < todayStr) {
        overdueSeriesIds.add(p.seriesId);
      }
    }

    // Получаем активные серии пользователя
    const seriesList = await getActiveRecurringSeries(userId);
    await loadSeriesCurrencies(userId, seriesList.map((series) => series.id), currencyBySeries);

    const virtualPayments: any[] = [];
    for (const series of seriesList as any[]) {
      try {
        if (!series.recurrenceRule) continue;

        // Определяем границу начала генерации: следующий день после generatedUntil (если есть), иначе после startDate
        const baseBoundary: string = series.generatedUntil || series.startDate;
        const boundary = new Date(baseBoundary);
        boundary.setHours(0, 0, 0, 0);
        boundary.setDate(boundary.getDate() + 1);

        // Для просроченной серии начинаем сразу после границы генерации,
        // чтобы захватить пропущенные периоды; для остальных — с сегодняшнего дня
        const includeMissed = overdueSeriesIds.has(series.id);
        const effectiveStart =
          includeMissed || boundary > windowStart
            ? new Date(boundary)
            : new Date(windowStart);

        // Ограничиваем конец окном и концом серии, если задано
        let effectiveEnd = new Date(windowEnd);
        if (series.recurrenceEndDate) {
          const endBySeries = new Date(series.recurrenceEndDate as any);
          endBySeries.setHours(23, 59, 59, 999);
          if (endBySeries < effectiveEnd) {
            effectiveEnd = endBySeries;
          }
        }

        if (effectiveStart > effectiveEnd) continue;

        const options = RRule.parseString(series.recurrenceRule as string);
        options.dtstart = normalizeDateToUTC(new Date(series.startDate as any));
        const rule = new RRule(options);

        const hits = rule.between(
          normalizeDateToUTC(effectiveStart),
          normalizeDateToUTC(effectiveEnd),
          true
        );

        const existing =
          existingDatesBySeries.get(series.id) || new Set<string>();
        let missedCount = 0;
        for (const d of hits) {
          const dStr = d.toISOString().slice(0, 10);
          if (existing.has(dStr)) continue; // уже есть реальный платеж на эту дату
          const isMissed = dStr < todayStr;
          if (isMissed) {
            // Защита от огромных списков (например, ежедневная серия, забытая на годы)
            if (missedCount >= MAX_MISSED_OCCURRENCES) continue;
            missedCount++;
          }
          virtualPayments.push({
            id: `virtual:${series.id}:${dStr}`,
            userId: userId,
            title: series.title,
            amount: Number(series.amount),
            dueDate: dStr,
            status: isMissed ? "overdue" : "upcoming",
            remind: series.remind,
            seriesId: series.id,
            builtinIconName: series.builtinIconName,
            currency: currencyBySeries.get(series.id) || "RUB",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isVirtual: true,
            // Добавляем объект series, чтобы фронтенд мог отобразить данные повторения
            series: {
              id: series.id,
              title: series.title,
              amount: Number(series.amount),
              recurrenceRule: series.recurrenceRule,
              recurrenceEndDate: series.recurrenceEndDate,
              builtinIconName: series.builtinIconName,
              isActive: series.isActive,
              generatedUntil: (series as any).generatedUntil || null,
            },
          });
        }
        if (missedCount >= MAX_MISSED_OCCURRENCES) {
          logger.warn(
            `Series ${series.id} has more than ${MAX_MISSED_OCCURRENCES} missed occurrences; list truncated`
          );
        }
      } catch (e) {
        // Ошибку парсинга правил или генерации пропускаем, чтобы не ломать общий ответ
        logger.warn(
          `Failed to compute virtual occurrences for series ${series.id}`,
          e
        );
      }
    }

    const combined = [...(payments as any[]), ...virtualPayments].sort(
      (a, b) => {
        const aDate =
          a.dueDate instanceof Date ? a.dueDate : new Date(String(a.dueDate));
        const bDate =
          b.dueDate instanceof Date ? b.dueDate : new Date(String(b.dueDate));
        return aDate.getTime() - bDate.getTime();
      }
    );

    return combined;
  } catch (error) {
    logger.error(`Error fetching upcoming payments for user ${userId}:`, error);
    throw new Error("Не удалось получить предстоящие платежи.");
  }
};

// Получить полный список платежей с фильтрацией (2.3)
// Реализация фильтрации будет дорабатываться в Части 6
export const getFilteredPayments = async (
  userId: string,
  filters: PaymentFilterParams = {}
): Promise<PaymentInstance[]> => {
  try {
    const statusValue =
      typeof filters.status === "string" &&
      ["upcoming", "overdue", "completed", "deleted"].includes(filters.status)
        ? filters.status
        : undefined;

    const initialWhere: WhereOptions<PaymentAttributes> = {
      userId,
      status: statusValue
        ? statusValue
        : { [Op.notIn]: ["completed", "deleted"] },
    };

    const where = getWhereWithSearch(
      initialWhere,
      filters.search
    ) as WhereAttributeHash<PaymentAttributes>;

    if (typeof filters.categoryId === "string") {
      const trimmedCategoryId = filters.categoryId.trim();
      if (trimmedCategoryId === NO_CATEGORY_FILTER_VALUE) {
        where.categoryId = null;
      } else if (trimmedCategoryId) {
        where.categoryId = trimmedCategoryId;
      }
    }

    if (filters.isRecurring === "true") {
      where.seriesId = { [Op.ne]: null };
    } else if (filters.isRecurring === "false") {
      where.seriesId = { [Op.eq]: null };
    }

    if (filters.hasFile === "true") {
      where.filePath = { [Op.ne]: null };
    } else if (filters.hasFile === "false") {
      where.filePath = { [Op.eq]: null };
    }

    const order: any = [["dueDate", "ASC"]];

    const payments = await db.Payment.findAll({
      where,
      order,
      include: [
        {
          model: db.TransactionCategory,
          as: "transactionCategory",
          attributes: ["id", "name", "nameEn", "builtinIconName"],
        },
        {
          model: SeriesModel,
          as: "series",
          attributes: [
            "id",
            "title",
            "amount",
            "recurrenceRule",
            "recurrenceEndDate",
            "builtinIconName",
            "isActive",
          ],
        },
      ],
    });

    logger.info(
      `Fetched ${payments.length} filtered payments for user ${userId}`
    );
    if (!filters.includeMissed) return payments;

    const missed = await buildMissedOccurrences(userId, payments);
    if (missed.length === 0) return payments;
    logger.info(
      `Added ${missed.length} missed recurring occurrences for user ${userId}`
    );
    // Виртуальные платежи не являются экземплярами модели — отдаем их вместе в JSON
    return [...payments, ...missed].sort((a, b) =>
      String((a as { dueDate: unknown }).dueDate).localeCompare(
        String((b as { dueDate: unknown }).dueDate)
      )
    ) as unknown as PaymentInstance[];
  } catch (error) {
    logger.error(`Error fetching filtered payments for user ${userId}:`, error);
    throw new Error("Не удалось получить список платежей.");
  }
};

// --- Функции CRUD ---

// Создание платежа (2.2)
export const createPayment = async (
  userId: string,
  paymentData: PaymentData
): Promise<PaymentInstance> => {
  // TODO: Add more strict validation for paymentData (e.g., with express-validator or manually)
  // Check required fields: title, amount, dueDate
  if (
    !paymentData.title ||
    paymentData.amount == null ||
    !paymentData.dueDate
  ) {
    throw new Error("Missing required fields: title, amount, or due date.");
  }
  // Check date format, amount, etc.

  try {
    const tagIds = normalizeTagIds(paymentData.tagIds);
    await ensureTagsExist(userId, tagIds);

    // Дедупликация для autoCreated платежей: проверяем, не создан ли уже такой платёж
    if (paymentData.autoCreated && paymentData.completedAt) {
      const completedAtDate =
        typeof paymentData.completedAt === "string"
          ? new Date(paymentData.completedAt)
          : paymentData.completedAt;

      // Ищем платёж с тем же title, amount и completedAt в пределах 10 секунд
      const tenSecondsAgo = new Date(completedAtDate.getTime() - 10000);
      const tenSecondsAfter = new Date(completedAtDate.getTime() + 10000);

      const existingPayment = await db.Payment.findOne({
        where: {
          userId,
          title: paymentData.title,
          amount: paymentData.amount,
          autoCreated: true,
          completedAt: {
            [Op.between]: [tenSecondsAgo, tenSecondsAfter],
          },
        },
      });

      if (existingPayment) {
        logger.info(
          `Duplicate auto-created payment detected (title: ${paymentData.title}, amount: ${paymentData.amount}), returning existing: ${existingPayment.id}`
        );
        const fetchedPayment = await getPaymentById(existingPayment.id, userId);
        if (!fetchedPayment) {
          throw new Error("Не удалось получить существующий платёж.");
        }
        return fetchedPayment;
      }
    }

    let seriesId: string | null = null;

    // If creating a recurring payment, create a RecurringSeries entry first
    if (paymentData.recurrenceRule) {
      let recurrenceEndDate: Date | null = null;
      if (paymentData.recurrenceEndDate) {
        recurrenceEndDate = new Date(paymentData.recurrenceEndDate);
        recurrenceEndDate.setUTCHours(0, 0, 0, 0);
      }

      const newSeries = await createRecurringSeries(userId, {
        title: paymentData.title,
        amount: paymentData.amount,
        categoryId: paymentData.categoryId,
        startDate: paymentData.dueDate,
        recurrenceRule: paymentData.recurrenceRule,
        recurrenceEndDate: recurrenceEndDate,
        builtinIconName: paymentData.builtinIconName,
        remind: paymentData.remind || false,
      });
      seriesId = newSeries.id;
    }

    // Create the payment instance
    let completionDate: Date | null = null;
    if (paymentData.createAsCompleted) {
      if (paymentData.completedAt) {
        if (typeof paymentData.completedAt === "string") {
          const parsedDate = new Date(paymentData.completedAt);
          if (isNaN(parsedDate.getTime())) {
            throw new Error("Некорректный формат даты завершения.");
          }
          completionDate = parsedDate;
        } else if (paymentData.completedAt instanceof Date) {
          completionDate = paymentData.completedAt;
        } else {
          // completedAt должен быть строкой, датой или null
          throw new Error("Некорректный тип значения completedAt");
        }
      } else {
        completionDate = new Date();
      }
    }

    const payment = await db.Payment.create({
      userId: userId,
      categoryId: paymentData.categoryId || null,
      title: paymentData.title,
      amount: paymentData.amount,
      dueDate: paymentData.dueDate,
      seriesId: seriesId, // Link to the recurring series (or null for non-recurring)
      remind: paymentData.remind || false,
      autoCreated: paymentData.autoCreated || false,

      status: paymentData.createAsCompleted ? "completed" : "upcoming",
      completedAt: completionDate,
      // filePath, fileName, builtinIconName are handled by fileService/icon logic
      // Copy icon data to the first payment instance if it's a new series
      builtinIconName: paymentData.builtinIconName || null,
      currency: normalizePaymentCurrency(paymentData.currency),
    });

    await attachPaymentTags(payment.id, tagIds);

    logger.info(
      `Payment created (ID: ${payment.id}, User: ${userId}, Status: ${payment.status}, Series ID: ${payment.seriesId})`
    );

    // If created as completed and part of a series, generate the next payment
    if (payment.status === "completed" && seriesId) {
      try {
        await generateNextRecurrentPaymentForSeries(seriesId);
      } catch (genError) {
        logger.warn(
          `Failed to generate next payment for new series ${seriesId} after initial completed payment`,
          genError
        );
      }
    }

    // Return the payment with category and series data after creation
    const createdPayment = await getPaymentById(payment.id, userId);
    if (!createdPayment) {
      throw new Error("Не удалось получить созданный платёж.");
    }
    return createdPayment;
  } catch (error: any) {
    logger.error(`Error creating payment for user ${userId}:`, error);
    throw new Error(error.message || "Failed to create payment.");
  }
};

// Получение деталей платежа (2.2)
export const getPaymentById = async (
  paymentId: string,
  userId: string
): Promise<PaymentInstance | null> => {
  try {
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId, // Mandatory ownership check
      },
      attributes: [
        // Explicitly select fields, including file fields
        "id",
        "title",
        "amount",
        "dueDate",
        "status",
        "createdAt",
        "updatedAt",
        "completedAt",
        "filePath",
        "fileName", // Include file fields
        "builtinIconName",
        "seriesId", // Include seriesId
        "remind",
        "autoCreated",
      ],
      include: [
        {
          model: db.TransactionCategory,
          as: "transactionCategory",
          attributes: ["id", "name", "nameEn", "builtinIconName"],
        }, // Include category
        {
          model: SeriesModel,
          as: "series",
          attributes: [
            "id",
            "title",
            "amount",
            "recurrenceRule",
            "recurrenceEndDate",
            "builtinIconName",
            "isActive",
          ],
        }, // Include recurring series data
        {
          model: TagModel,
          as: "tags",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    if (!payment) {
      logger.warn(
        `Payment not found or no access (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Платеж не найден или не принадлежит пользователю
    }

    if (payment.seriesId) {
      // Find the last *active* payment in the series
      const lastPaymentInSeries = await db.Payment.findOne({
        where: {
          seriesId: payment.seriesId,
          status: { [Op.in]: ["upcoming", "overdue"] },
        },
        order: [["dueDate", "DESC"]],
      });
      // Add a non-persistent flag to the instance
      payment.setDataValue(
        "isLastInSeries" as any,
        lastPaymentInSeries ? lastPaymentInSeries.id === payment.id : false
      );
    } else {
      payment.setDataValue("isLastInSeries" as any, false);
    }

    logger.info(`Fetched payment details (ID: ${payment.id}, User: ${userId})`);
    return payment;
  } catch (error) {
    logger.error(
      `Error fetching payment (ID: ${paymentId}, User: ${userId}):`,
      error
    );
    throw new Error("Не удалось получить детали платежа.");
  }
};

// Редактирование платежа (2.2)
export const updatePayment = async (
  paymentId: string,
  userId: string,
  paymentData: Partial<PaymentData>
): Promise<PaymentInstance | null> => {
  // TODO: Add validation for paymentData
  if (Object.keys(paymentData).length === 0) {
    throw new Error("No data provided for update.");
  }
  // Ensure that recurrence-related fields are not updated via this endpoint
  const disallowedFields = [
    "isRecurrent",
    // "recurrencePattern", // Удалено, чтобы разрешить установку для нового шаблона
    // "recurrenceEndDate", // Удалено
    "seriesId", // seriesId по-прежнему не должен меняться напрямую для существующей серии
    // Removed "parentId" as it no longer exists
  ];
  disallowedFields.forEach((field) => {
    if (paymentData.hasOwnProperty(field)) {
      logger.warn(
        `Attempted to update disallowed field "${field}" on payment ${paymentId} by user ${userId}. Ignoring.`
      );

      delete (paymentData as any)[field]; // Remove disallowed field
    }
  });

  try {
    // Find the payment to ensure it belongs to the user
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found for update or no access (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Payment not found or does not belong to the user
    }

    if (
      payment.autoCreated &&
      Object.prototype.hasOwnProperty.call(paymentData, "categoryId")
    ) {
      const nextCategoryId =
        paymentData.categoryId !== undefined ? paymentData.categoryId : null;
      if (nextCategoryId !== payment.categoryId) {
        throw new Error(
          "Категория для автоматически добавленных платежей изменяется через правила автоматизации."
        );
      }
    }

    // Prevent changing recurrence for deleted payments
    if (
      payment.status === "deleted" &&
      paymentData.hasOwnProperty("recurrenceRule")
    ) {
      throw new Error("Cannot change recurrence for a deleted payment.");
    }

    // Update only the provided allowed fields
    const fieldsToUpdate: any = {};
    const allowedFields = [
      "title",
      "amount",
      "dueDate",
      "categoryId",
      "filePath",
      "fileName",
      "builtinIconName",
      "completedAt",
      "remind",
      "currency",
    ];

    allowedFields.forEach((field) => {
      if (paymentData.hasOwnProperty(field)) {
        fieldsToUpdate[field] = (paymentData as any)[field];
      }
    });
    if (fieldsToUpdate.currency !== undefined) {
      fieldsToUpdate.currency = normalizePaymentCurrency(fieldsToUpdate.currency);
    }

    // Специальная обработка для completedAt
    if (fieldsToUpdate.completedAt) {
      if (payment.status !== "completed") {
        logger.warn(
          `Attempt to update completedAt for a non-completed payment ${paymentId}. Ignoring.`
        );
        delete fieldsToUpdate.completedAt;
      } else {
        const newDate = new Date(fieldsToUpdate.completedAt);
        if (isNaN(newDate.getTime())) {
          throw new Error("Неверный формат даты выполнения.");
        }
        fieldsToUpdate.completedAt = newDate;
      }
    }

    // If there are fields to update, perform the update
    // Логика для конвертации разового платежа в новый регулярный
    if (paymentData.recurrenceRule && !payment.seriesId) {
      logger.info(
        `Converting one-time payment ${payment.id} to a new recurring series.`
      );
      let recurrenceEndDateForNewSeries: Date | null = null;
      if (paymentData.recurrenceEndDate) {
        // paymentData.recurrenceEndDate is expected to be a string based on interface
        const endDateInput = new Date(paymentData.recurrenceEndDate as string);
        if (!isNaN(endDateInput.getTime())) {
          // Проверка на валидность даты
          recurrenceEndDateForNewSeries = endDateInput;
          recurrenceEndDateForNewSeries.setUTCHours(0, 0, 0, 0);
        } else {
          logger.warn(
            `Invalid recurrenceEndDate received: ${paymentData.recurrenceEndDate}`
          );
        }
      }

      const newSeries = await createRecurringSeries(userId, {
        title: fieldsToUpdate.title || payment.title,
        amount: fieldsToUpdate.amount || payment.amount,
        categoryId:
          fieldsToUpdate.categoryId !== undefined
            ? fieldsToUpdate.categoryId
            : payment.categoryId,
        startDate: fieldsToUpdate.dueDate || payment.dueDate,
        recurrenceRule: paymentData.recurrenceRule,
        recurrenceEndDate: recurrenceEndDateForNewSeries,
        builtinIconName:
          paymentData.builtinIconName !== undefined
            ? paymentData.builtinIconName
            : payment.builtinIconName,
        remind:
          fieldsToUpdate.remind !== undefined
            ? fieldsToUpdate.remind
            : payment.remind,
      });

      fieldsToUpdate.seriesId = newSeries.id; // Привязываем платеж к новой серии
      logger.info(
        `Created new recurring series (ID: ${newSeries.id}) for payment ${payment.id} during update.`
      );

      // If the payment is already completed, we should generate the next instance immediately
      if (payment.status === "completed") {
        try {
          await generateNextRecurrentPaymentForSeries(newSeries.id);
        } catch (genError) {
          logger.warn(
            `Failed to generate next payment for new series ${newSeries.id} created from completed payment`,
            genError
          );
        }
      }

      // Если иконка была изменена в paymentData, она уже будет в fieldsToUpdate
      // и применится к экземпляру платежа ниже.
    } else if (
      paymentData.hasOwnProperty("recurrenceRule") &&
      paymentData.recurrenceRule === null &&
      payment.seriesId
    ) {
      // Если пользователь явно очистил recurrencePattern для существующего регулярного платежа,
      // отсоединяем его от серии (делаем разовым) И деактивируем саму серию.
      logger.info(
        `Detaching payment ${payment.id} from series ${payment.seriesId} to make it one-time and deactivating the series.`
      );

      // Deactivate the series
      await deactivateSeries(payment.seriesId);

      fieldsToUpdate.seriesId = null;
      // Также удаляем recurrencePattern и recurrenceEndDate из fieldsToUpdate, т.к. они относятся к серии
      delete fieldsToUpdate.recurrenceRule;
      delete fieldsToUpdate.recurrenceEndDate;
    } else if (
      payment.seriesId &&
      (paymentData.hasOwnProperty("recurrenceRule") ||
        paymentData.hasOwnProperty("recurrenceEndDate"))
    ) {
      // Если платеж уже является частью серии, и в paymentData есть recurrencePattern/EndDate,
      // эти поля не должны изменять саму серию через обновление экземпляра.
      // Изменения серии происходят через SeriesEditModal.
      // Поэтому удаляем их из fieldsToUpdate, чтобы не пытаться применить к экземпляру.
      logger.warn(
        `Attempted to change series pattern/endDate for payment instance ${payment.id}. These changes should be made via SeriesEditModal. Ignoring for instance.`
      );
      delete fieldsToUpdate.recurrenceRule;
      delete fieldsToUpdate.recurrenceEndDate;
    }
    if (Object.keys(fieldsToUpdate).length > 0) {
      await payment.update(fieldsToUpdate);
      logger.info(`Payment updated (ID: ${payment.id}, User: ${userId})`);
    } else {
      logger.info(
        `No allowed fields to update for payment (ID: ${payment.id}, User: ${userId})`
      );
    }

    const shouldUpdateTags = Object.prototype.hasOwnProperty.call(
      paymentData,
      "tagIds"
    );
    if (shouldUpdateTags) {
      const nextTagIds = normalizeTagIds(paymentData.tagIds);
      await ensureTagsExist(userId, nextTagIds);
      await replacePaymentTags(payment.id, nextTagIds);
    }

    // Check if the due date has passed and update the status accordingly
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set time to midnight for date comparison

    const effectiveDueDateValue =
      fieldsToUpdate.dueDate !== undefined
        ? fieldsToUpdate.dueDate
        : payment.dueDate;
    const dueDate = new Date(effectiveDueDateValue);
    dueDate.setHours(0, 0, 0, 0); // Set time to midnight for date comparison

    if (dueDate < now && payment.status === "upcoming") {
      await payment.update({ status: "overdue" });
      logger.info(
        `Payment status updated to overdue (ID: ${payment.id}, User: ${userId})`
      );
    } else if (dueDate >= now && payment.status === "overdue") {
      // If due date is now or in the future, and status is overdue, set to upcoming
      await payment.update({ status: "upcoming" });
      logger.info(
        `Payment status updated to upcoming (ID: ${payment.id}, User: ${userId})`
      );
    }

    // Return the updated payment
    // Fetch again to include related data if needed for response
    return await getPaymentById(payment.id, userId); // Use our fetch function
  } catch (error) {
    logger.error(
      `Error updating payment (ID: ${paymentId}, User: ${userId}):`,
      error
    );
    throw new Error("Failed to update payment.");
  }
};

// "Удаление" платежа (логическое, перемещение в архив со статусом 'deleted') (2.2, 2.7)
// При логическом удалении также удаляем прикрепленный файл.

export const deletePayment = async (paymentId: string, userId: string) => {
  logger.info(
    `Attempting to soft-delete payment (ID: ${paymentId}, User: ${userId})`
  );
  try {
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        status: { [Op.ne]: "deleted" },
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found for soft delete or no access (ID: ${paymentId}, User: ${userId})`
      );
      return null;
    }

    const originalSeriesId = payment.seriesId;
    const originalStatus = payment.status;

    await payment.update({
      status: "deleted",
    });

    logger.info(`Payment soft-deleted (ID: ${payment.id}, User: ${userId}).`);

    // На удалении: 1) обновляем generatedUntil как минимум до даты удаленного платежа,
    // 2) создаем следующий экземпляр СТРОГО после границы (никогда не на удаленную дату).
    if (
      originalSeriesId &&
      (originalStatus === "upcoming" || originalStatus === "overdue")
    ) {
      const series = await getRecurringSeriesByIdInternal(originalSeriesId);
      if (series && series.isActive) {
        // 1) Обновляем границу до даты удаленного экземпляра
        try {
          const currentBoundary = series.generatedUntil
            ? new Date(series.generatedUntil)
            : null;
          const thisDate = new Date(payment.dueDate);
          if (!currentBoundary || thisDate > currentBoundary) {
            await updateSeriesGeneratedUntil(series.id, payment.dueDate);
          }
        } catch (e) {
          logger.warn(
            `Could not update generatedUntil for series ${series.id} on delete of payment ${payment.id}.`
          );
        }

        // 2) Генерируем следующий экземпляр единым хелпером
        try {
          await generateNextRecurrentPaymentForSeries(series.id);
        } catch (e) {
          logger.error(
            `Error generating next instance on delete for series ${series.id}:`,
            e
          );
        }
      }
    }

    return payment;
  } catch (error) {
    logger.error(
      `Error soft-deleting payment (ID: ${paymentId}, User: ${userId}):`,
      error
    );
    throw new Error("Failed to delete payment.");
  }
};

// --- Новая функция: Получить список платежей из архива (2.5) ---
export const getArchivedPayments = async (
  userId: string,
  filters: PaymentFilterParams = {}
): Promise<PaymentInstance[]> => {
  try {
    const statusValue =
      typeof filters.status === "string" &&
      ["completed", "deleted"].includes(filters.status)
        ? filters.status
        : undefined;

    const initialWhere: WhereOptions<PaymentAttributes> = {
      userId,
      status: statusValue ? statusValue : { [Op.in]: ["completed", "deleted"] },
    };

    const where = getWhereWithSearch(
      initialWhere,
      filters.search
    ) as WhereAttributeHash<PaymentAttributes>;

    if (typeof filters.categoryId === "string") {
      const trimmedCategoryId = filters.categoryId.trim();
      if (trimmedCategoryId === NO_CATEGORY_FILTER_VALUE) {
        where.categoryId = null;
      } else if (trimmedCategoryId) {
        where.categoryId = trimmedCategoryId;
      }
    }

    if (filters.isRecurring === "true") {
      where.seriesId = { [Op.ne]: null };
    } else if (filters.isRecurring === "false") {
      where.seriesId = { [Op.eq]: null };
    }

    if (filters.hasFile === "true") {
      where.filePath = { [Op.ne]: null };
    } else if (filters.hasFile === "false") {
      where.filePath = { [Op.eq]: null };
    }

    const order: any = [
      ["completedAt", "DESC"],
      ["createdAt", "DESC"],
    ];

    const payments = await db.Payment.findAll({
      where,
      order,
      include: [
        {
          model: db.TransactionCategory,
          as: "transactionCategory",
          attributes: ["id", "name", "nameEn", "builtinIconName"],
        },
        {
          model: SeriesModel,
          as: "series",
          attributes: [
            "id",
            "title",
            "recurrenceRule",
            "recurrenceEndDate",
            "isActive",
          ],
        },
      ],
    });

    logger.info(
      `Fetched ${payments.length} archived payments for user ${userId}`
    );
    return payments;
  } catch (error) {
    logger.error(`Error fetching archived payments for user ${userId}:`, error);
    throw new Error("Failed to fetch archived payments list.");
  }
};

// --- Новая функция: Восстановить платеж из архива (2.5, 2.8) ---
// Status 'completed' or 'deleted' -> 'upcoming' (or 'overdue' if date is in the past)
export const restorePayment = async (
  paymentId: string,
  userId: string,
  options: { reactivateSeries?: boolean } = {}
) => {
  const { reactivateSeries = false } = options;
  const transaction = await db.sequelize.transaction();
  try {
    // Find the payment in the archive, ensure it belongs to the user and has status 'completed' or 'deleted'
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        status: { [Op.in]: ["completed", "deleted"] }, // Only from archive
      },
      transaction,
    });

    if (!payment) {
      await transaction.rollback();
      logger.warn(
        `Payment not found for restore or invalid status (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Payment not found, does not belong to the user, or its status does not allow restoration
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    // Determine the new status: 'upcoming' if due date is in the future, 'overdue' if in the past
    const newStatus = dueDate >= now ? "upcoming" : "overdue";

    // When restoring, reset completedAt (as the payment is active again)
    await payment.update(
      {
        status: newStatus,
        completedAt: null, // Reset completion date
      },
      { transaction }
    );

    // If reactivating the series is requested, find the series and update it
    if (reactivateSeries && payment.seriesId) {
      const series = await getRecurringSeriesById(
        payment.seriesId,
        userId,
        transaction
      );

      if (series && !series.isActive) {
        await activateSeries(series.id, transaction);
        logger.info(
          `Recurring series ${series.id} reactivated upon restoring payment ${payment.id}.`
        );
      }
    }

    await transaction.commit();

    logger.info(
      `Payment restored from archive (ID: ${payment.id}, User: ${userId}). New status: ${newStatus}`
    );

    return payment; // Return the restored payment
  } catch (error: any) {
    await transaction.rollback();
    logger.error(
      `Error restoring payment ${paymentId} from archive (User: ${userId}):`,
      error
    );
    throw new Error("Failed to restore payment from archive.");
  }
};

// --- New function: Permanent (full) deletion of a payment (2.5, 2.8) ---
// Deletes the record from the DB AND associated files/icons from the FS.
export const permanentDeletePayment = async (
  paymentId: string,
  userId: string
) => {
  logger.info(
    `Attempting to permanently delete payment (ID: ${paymentId}, User: ${userId})`
  );
  try {
    // Find the payment, ensure it belongs to the user
    // Permanent deletion can be allowed ONLY for status 'deleted' or 'completed' (from archive)
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        status: { [Op.in]: ["completed", "deleted"] }, // Allow permanent deletion only from archive
        // If you need to allow permanent deletion from anywhere, remove this condition
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found for permanent delete or not in archive (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Payment not found, does not belong to the user, or not in archive
    }

    // !!! Delete associated files and custom icons from the file system !!!
    // Use functions from fileService.
    // deleteFileFromFS(userId, paymentId) without fileName will delete the entire payment folder /uploads/users/[user_id]/payments/[payment_id]/
    // This folder contains both payment files and custom icons.
    try {
      await deleteFileFromFS(userId, paymentId); // Delete the entire payment folder
      logger.info(
        `Deleted files/icons directory for payment ${paymentId} from FS.`
      );
    } catch (fsError: any) {
      // Log the error, but do not interrupt the deletion of the DB record,
      // as deleting the DB record is more important. The FS issue might be temporary.
      logger.error(
        `Error deleting files/icons directory for payment ${paymentId} from FS:`,
        fsError
      );
    }
    // Note: detachIconFromPayment and detachFileFromPayment only delete one specific file/icon.
    // deleteFileFromFS(userId, paymentId) without a file name is a more appropriate way to delete all payment resources.

    // Delete the payment record from the database
    await payment.destroy();

    logger.info(
      `Payment permanently deleted (ID: ${payment.id}, User: ${userId}). Record removed from DB.`
    );
    return true; // Return true on successful deletion
  } catch (error: any) {
    logger.error(
      `Error permanently deleting payment ${paymentId} (User: ${userId}):`,
      error
    );
    throw new Error(error.message || "Failed to permanently delete payment.");
  }
};

export const clearTrash = async (userId: string): Promise<number> => {
  try {
    const trashedPayments = await db.Payment.findAll({
      where: { userId, status: "deleted" },
    });

    if (trashedPayments.length === 0) {
      return 0;
    }

    for (const payment of trashedPayments) {
      try {
        await deleteFileFromFS(userId, payment.id);
      } catch (fsError: any) {
        logger.error(
          `Error deleting files/icons directory for payment ${payment.id} from FS:`,
          fsError
        );
      }
      await payment.destroy();
    }

    logger.info(
      `Cleared trash for user ${userId}. Deleted ${trashedPayments.length} payments.`
    );
    return trashedPayments.length;
  } catch (error: any) {
    logger.error(`Error clearing trash for user ${userId}:`, error);
    throw new Error("Не удалось очистить корзину.");
  }
};

// Безвозвратное удаление autoCreated платежей (например, при отмене авто-создания)
// Специально для autoCreated платежей, которые пользователь хочет безвозвратно удалить
// (например, при нажатии "Отменить" в уведомлении после автоматического создания платежа).
export const permanentDeletePaymentAutoCreated = async (
  paymentId: string,
  userId: string
): Promise<boolean> => {
  logger.info(
    `Attempting to permanently delete autoCreated payment (ID: ${paymentId}, User: ${userId})`
  );
  try {
    // Находим платеж, проверяем что он принадлежит пользователю и имеет флаг autoCreated
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        autoCreated: true, // Разрешаем безвозвратное удаление только для autoCreated платежей
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found, not autoCreated, or no access (ID: ${paymentId}, User: ${userId})`
      );
      return false; // Платеж не найден, не является autoCreated или не принадлежит пользователю
    }

    // Удаляем связанные файлы и иконки из файловой системы
    try {
      await deleteFileFromFS(userId, paymentId);
      logger.info(
        `Deleted files/icons directory for autoCreated payment ${paymentId} from FS.`
      );
    } catch (fsError: any) {
      logger.error(
        `Error deleting files/icons directory for payment ${paymentId} from FS:`,
        fsError
      );
    }

    // Удаляем запись платежа из базы данных (безвозвратное удаление)
    await payment.destroy();

    logger.info(
      `AutoCreated payment permanently deleted (ID: ${payment.id}, User: ${userId}). Record removed from DB.`
    );
    return true;
  } catch (error: any) {
    logger.error(
      `Error permanently deleting autoCreated payment ${paymentId} (User: ${userId}):`,
      error
    );
    return false;
  }
};

// Отметка платежа как выполненного (статус 'completed') (2.2, 2.7)
// Для повторяющихся платежей это отмечает текущий экземпляр и готовит к генерации следующего (логика в Части 15/Крон)
// --- Доработка функции completePayment ---
// После отметки выполнения повторяющегося платежа, нужно создать следующий экземпляр.
export const completePayment = async (
  paymentId: string,
  userId: string,
  completionDate?: string
) => {
  logger.info(
    `Attempting to complete payment (ID: ${paymentId}, User: ${userId}) with date: ${completionDate}`
  );
  try {
    // Находим платеж, чтобы убедиться, что он принадлежит пользователю и имеет статус 'upcoming' или 'overdue'
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        status: { [Op.in]: ["upcoming", "overdue"] }, // Завершить можно только предстоящие или просроченные
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found for completion or invalid status (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Платеж не найден, не принадлежит пользователю или уже выполнен/удален
    }

    const originalSeriesId = payment.seriesId; // Сохраняем ID серии до обновления

    // Обновляем статус на 'completed' и устанавливаем дату выполнения
    await payment.update({
      status: "completed",
      completedAt: completionDate
        ? new Date(completionDate)
        : Sequelize.literal("NOW()"),
    });
    logger.info(`Payment completed (ID: ${payment.id}, User: ${userId}).`);

    // Начало новой логики для генерации следующего платежа в серии
    if (originalSeriesId) {
      const completedPaymentDueDate = new Date(payment.dueDate); // Дата выполненного платежа
      completedPaymentDueDate.setHours(0, 0, 0, 0);

      // Use seriesService helper to check deactivation and update boundary
      const { series, isActive } = await processSeriesAfterPaymentCompletion(
        originalSeriesId,
        completedPaymentDueDate
      );

      if (series && isActive) {
        // Calculate the next due date
        const nextDueDate = await calculateNextDueDateForSeries(
          series,
          completedPaymentDueDate // boundary is the completed payment date
        );

        // Another check for recurrenceEndDate (already done partially in calculateNextDueDateForSeries, but logic here was robust)
        // calculateNextDueDateForSeries returns null if next > end date.

        if (!nextDueDate) {
          // No valid next date (or exceeded end date), deactivate series
          await deactivateSeries(series.id);
          logger.info(
            `Deactivated series ${series.id} as there is no valid next occurrence.`
          );
        } else {
          // Valid next date found.
          // Update boundary again to be sure (processSeriesAfterPaymentCompletion does it, but we can ensure)
          // Then generate
          await generateNextRecurrentPaymentForSeries(series.id);
        }
      } else if (!series) {
        logger.warn(
          `Series ${originalSeriesId} not found for completed payment ${payment.id}. Cannot generate next.`
        );
      }
    }

    return payment; // Возвращаем обновленный (выполненный) платеж
  } catch (error: any) {
    logger.error(
      `Error completing payment (ID: ${paymentId}, User: ${userId}):`,
      error
    );
    throw new Error(error.message || "Failed to mark payment as completed.");
  }
};

/**
 * Отметить выполненными все пропущенные периоды серии, начиная с указанного платежа.
 * Закрывает платеж, после чего completePayment создает следующий экземпляр;
 * пока он остается в прошлом (до сегодняшнего дня), закрываем и его.
 * Останавливается на первом экземпляре с датой не раньше сегодняшней.
 * @param useDueDates - отметить каждый платеж датой его срока вместо completionDate
 * @returns число выполненных платежей или null, если исходный платеж не найден
 */
export const completeOverdueSeriesPayments = async (
  paymentId: string,
  userId: string,
  options: { completionDate?: string; useDueDates?: boolean } = {}
): Promise<number | null> => {
  const { completionDate, useDueDates = false } = options;
  logger.info(
    `Attempting to complete all overdue payments starting from ${paymentId} (User: ${userId}, useDueDates: ${useDueDates})`
  );

  const first = await db.Payment.findOne({
    where: {
      id: paymentId,
      userId,
      status: { [Op.in]: ["upcoming", "overdue"] },
    },
  });
  if (!first) {
    logger.warn(
      `Payment not found for bulk completion or invalid status (ID: ${paymentId}, User: ${userId})`
    );
    return null;
  }

  const todayStr = toServerDateString(new Date());
  if (!first.seriesId || String(first.dueDate) >= todayStr) {
    // Не серия или платеж не просрочен — закрываем только его
    const completed = await completePayment(
      first.id,
      userId,
      useDueDates ? String(first.dueDate) : completionDate
    );
    return completed ? 1 : 0;
  }

  const seriesId = first.seriesId;
  let current: PaymentInstance | null = first;
  let completedCount = 0;

  while (current && completedCount < MAX_MISSED_OCCURRENCES) {
    const completed = await completePayment(
      current.id,
      userId,
      useDueDates ? String(current.dueDate) : completionDate
    );
    if (!completed) break;
    completedCount++;

    // Следующий активный экземпляр серии, если он все еще в прошлом
    current = await db.Payment.findOne({
      where: {
        seriesId,
        userId,
        status: { [Op.in]: ["upcoming", "overdue"] },
        dueDate: { [Op.lt]: todayStr },
      },
      order: [["dueDate", "ASC"]],
    });
  }

  if (current && completedCount >= MAX_MISSED_OCCURRENCES) {
    logger.warn(
      `Stopped bulk completion for series ${seriesId} after ${MAX_MISSED_OCCURRENCES} payments`
    );
  }

  logger.info(
    `Completed ${completedCount} overdue payments in series ${seriesId} (User: ${userId})`
  );
  return completedCount;
};

/**
 * Объединить пропущенные периоды серии в один платеж.
 * Реальный просроченный платеж остается (с новыми полями из формы), а периоды серии
 * до untilDate включительно считаются закрытыми им: граница генерации серии сдвигается
 * на untilDate, поэтому пропущенные периоды больше не показываются. Серия не удаляется.
 * Если передан completedAt, объединенный платеж сразу отмечается выполненным.
 * @returns обновленный платеж или null, если платеж не найден
 */
export const mergeOverdueSeriesPayments = async (
  paymentId: string,
  userId: string,
  options: {
    untilDate: string;
    completedAt?: string | null;
    fields: Partial<PaymentData>;
  }
): Promise<PaymentInstance | null> => {
  const { untilDate, completedAt, fields } = options;
  logger.info(
    `Attempting to merge overdue series payments into ${paymentId} until ${untilDate} (User: ${userId})`
  );

  const payment = await db.Payment.findOne({
    where: {
      id: paymentId,
      userId,
      status: { [Op.in]: ["upcoming", "overdue"] },
    },
  });
  if (!payment) {
    logger.warn(
      `Payment not found for merge or invalid status (ID: ${paymentId}, User: ${userId})`
    );
    return null;
  }
  if (!payment.seriesId) {
    throw new Error("Объединять можно только платежи повторяющейся серии.");
  }

  const todayStr = toServerDateString(new Date());
  const dueStr = toDateOnlyString(payment.dueDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(untilDate) || untilDate < dueStr || untilDate >= todayStr) {
    throw new Error("Некорректная дата последнего пропущенного платежа.");
  }

  const seriesId = payment.seriesId;

  // Другие активные экземпляры серии в объединяемом периоде (обычно их нет) убираем в корзину
  await db.Payment.update(
    { status: "deleted" },
    {
      where: {
        userId,
        seriesId,
        id: { [Op.ne]: payment.id },
        status: { [Op.in]: ["upcoming", "overdue"] },
        dueDate: { [Op.lte]: untilDate },
      },
    }
  );

  // Поля платежа меняются как при обычном редактировании; повторение и серию не трогаем
  const safeFields: Partial<PaymentData> = { ...fields };
  delete (safeFields as Record<string, unknown>).recurrenceRule;
  delete (safeFields as Record<string, unknown>).recurrenceEndDate;
  delete (safeFields as Record<string, unknown>).seriesId;
  delete (safeFields as Record<string, unknown>).completedAt;
  if (Object.keys(safeFields).length > 0) {
    await updatePayment(payment.id, userId, safeFields);
  }

  // Периоды до untilDate закрыты объединенным платежом — сдвигаем границу генерации серии
  const series = await getRecurringSeriesByIdInternal(seriesId);
  const currentBoundary = series?.generatedUntil
    ? toDateOnlyString(series.generatedUntil)
    : null;
  if (!currentBoundary || currentBoundary < untilDate) {
    await updateSeriesGeneratedUntil(seriesId, untilDate);
  }

  if (completedAt) {
    await completePayment(payment.id, userId, completedAt);
  }

  logger.info(
    `Merged overdue payments of series ${seriesId} into payment ${payment.id} until ${untilDate}`
  );
  return db.Payment.findOne({ where: { id: payment.id, userId } });
};

// --- Генерация следующих экземпляров для всех активных серий (cron) ---
// Функция должна запускаться ежедневно.
// Алгоритм:
// 1. Находим все активные серии, у которых не истек срок (recurrenceEndDate ≥ сегодня или отсутствует).
// 2. Для каждой такой серии проверяем: есть ли платеж с dueDate > сегодня.
// 3. Если такого платежа нет, создаем следующий экземпляр, начиная от startDate или последнего платежа.
// Таким образом, всегда гарантируется, что у активной серии есть хотя бы один предстоящий платеж.

export const generateNextRecurrentPayments = async () => {
  logger.info("Running generateNextRecurrentPayments cron job...");
  let createdCount = 0;
  let checkedSeriesCount = 0;
  try {
    const activeSeries = await getAllActiveRecurringSeries();

    checkedSeriesCount = activeSeries.length;
    logger.info(
      `Found ${checkedSeriesCount} active recurring series to check.`
    );

    for (const series of activeSeries) {
      const result = await generateNextRecurrentPaymentForSeries(series.id);
      if (result) {
        createdCount++;
      }
    }

    logger.info(
      `generateNextRecurrentPayments job finished. Checked ${checkedSeriesCount} series, created ${createdCount} payments.`
    );
    return { createdCount, checkedSeriesCount };
  } catch (error) {
    logger.error("Error in generateNextRecurrentPayments job:", error);
    throw error;
  }
};

/**
 * Сгенерировать следующий платеж для КОНКРЕТНОЙ серии.
 * Правила:
 * - Если для серии уже есть активный платеж (upcoming/overdue), ничего не делать (вернуть null).
 * - Граница берется из series.generatedUntil (если null - день до startDate).
 * - Рассчитать следующую дату строго ПОСЛЕ границы по RRULE и с учетом recurrenceEndDate.
 * - Создать ровно один платеж и вернуть его.
 * - Если подходящей даты нет - деактивировать серию и вернуть null.
 */
export const generateNextRecurrentPaymentForSeries = async (
  seriesId: string
) => {
  try {
    const series = await getRecurringSeriesByIdInternal(seriesId);
    if (!series) {
      logger.warn(`Series ${seriesId} not found.`);
      return null;
    }
    if (!series.isActive) {
      logger.info(`Series ${series.id} is inactive. Skipping next generation.`);
      return null;
    }

    // Если уже есть активный экземпляр - выходим
    const activePaymentCount = await db.Payment.count({
      where: {
        seriesId: series.id,
        status: { [Op.in]: ["upcoming", "overdue"] },
      },
    });
    if (activePaymentCount > 0) {
      logger.info(
        `Series ${series.id} already has an active payment. Skipping single-series generation.`
      );
      return null;
    }

    // Граница
    const boundary = series.generatedUntil
      ? new Date(series.generatedUntil)
      : new Date(new Date(series.startDate).getTime() - 24 * 60 * 60 * 1000);

    // Следующая дата
    const nextDueDate = calculateNextDueDateForSeries(series, boundary);

    if (!nextDueDate) {
      await deactivateSeries(series.id);
      logger.info(
        `Deactivated series ${series.id} as there is no valid next occurrence for single-series generation.`
      );
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDueDateString = nextDueDate.toISOString().split("T")[0];
    const status = nextDueDate < today ? "overdue" : "upcoming";

    const latestInSeries = await db.Payment.findOne({
      where: { seriesId: series.id },
      order: [["dueDate", "DESC"]],
      attributes: ["currency"],
    });

    const newPayment = await db.Payment.create({
      userId: series.userId,
      categoryId: series.categoryId,
      title: series.title,
      amount: series.amount,
      dueDate: nextDueDateString,
      currency: normalizePaymentCurrency(latestInSeries?.currency),
      status,
      seriesId: series.id,
      builtinIconName: series.builtinIconName,
      remind: series.remind,
    });

    await updateSeriesGeneratedUntil(series.id, nextDueDateString);

    logger.info(
      `Generated next recurring payment for series ${series.id} on ${nextDueDateString} via single-series generation.`
    );

    return newPayment;
  } catch (error) {
    logger.error(
      `Error generating next recurring payment for series ${seriesId}:`,
      error
    );
    throw error;
  }
};

// --- Логика автоматической смены статуса upcoming -> overdue (выполняется фоновой задачей) ---
// Эта функция не вызывается напрямую из маршрутов API, только из cron job.
export const updateOverdueStatuses = async () => {
  logger.info("Running job: updateOverdueStatuses");
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Сравниваем только даты

    // Находим все платежи со статусом 'upcoming', у которых срок оплаты наступил или прошел
    const [affectedCount] = await db.Payment.update(
      { status: "overdue" },
      {
        where: {
          status: "upcoming", // Только предстоящие
          // Используем 'lt' (less than), чтобы платежи с сегодняшней датой не становились просроченными.
          // Платеж становится просроченным только на следующий день после dueDate.
          dueDate: { [Op.lt]: now }, // У которых срок оплаты < сегодня
        },
      }
    );

    logger.info(`Updated ${affectedCount} payments to status 'overdue'.`);
    return affectedCount;
  } catch (error) {
    logger.error("Error in updateOverdueStatuses cron job:", error);
    throw error; // Пробрасываем ошибку для логирования в cron runner
  }
};

// --- Новая функция: Получить статистику для дашборда за текущий месяц (2.3, 2.5) ---
export const getDashboardStats = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<ReturnType<typeof calculateDashboardStats>> => {
  try {
    const user = await db.User.findByPk(userId, {
      attributes: ["timezone", "preferredCurrency"],
    });
    const userTimezone = user?.timezone || config.defaultTimezone;
    const currency = normalizePaymentCurrency(user?.preferredCurrency);
    // Без текущих курсов статистика всё равно строится: совпадающие валюты и исторические курсы работают.
    const currentRates: ExchangeRates | null = await getUsdRates().catch((error: unknown) => {
      logger.warn("Current exchange rates unavailable for dashboard stats", error);
      return null;
    });

    const now = new Date();
    const periodStartDate = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEndDate = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Для `dueDate` (DATEONLY) используем строковое сравнение.
    const periodStartString = periodStartDate.toISOString().split("T")[0];
    const periodEndString = periodEndDate.toISOString().split("T")[0];

    // Для `completedAt` (DATETIME) создаем UTC-диапазон, соответствующий полному дню в таймзоне пользователя.
    const periodStartUTC = fromZonedTime(
      `${periodStartString}T00:00:00`,
      userTimezone
    );
    const periodEndUTC = fromZonedTime(
      `${periodEndString}T23:59:59.999`,
      userTimezone
    );

    // Один запрос для получения всех платежей, релевантных для статистики
    const relevantPayments: (PaymentInstance & {
      transactionCategory?: TransactionCategoryInstance | null;
    })[] = await db.Payment.findAll({
      where: {
        userId: userId,
        [Op.or]: [
          {
            // Платежи, у которых СРОК ОПЛАТЫ (DATEONLY) в периоде.
            dueDate: {
              [Op.between]: [periodStartString, periodEndString],
            },
            status: {
              [Op.notIn]: ["deleted", "completed"],
            },
          },
          {
            // ИЛИ платежи, которые были ЗАВЕРШЕНЫ (DATETIME) в UTC-диапазоне, эквивалентном периоду в таймзоне пользователя.
            status: "completed",
            completedAt: {
              [Op.between]: [periodStartUTC, periodEndUTC],
            },
          },
        ],
      },
      include: [
        {
          model: db.TransactionCategory,
          as: "transactionCategory",
          attributes: ["id", "name", "nameEn", "builtinIconName"],
        },
      ],
      attributes: [
        "id",
        "title",
        "amount",
        "dueDate",
        "status",
        "categoryId",
        "seriesId",
        "completedAt",
        "currency",
      ],
    });
    const transactionCategoriesById = new Map<
      string,
      TransactionCategoryInstance
    >();
    const paymentCategoryIds = Array.from(
      new Set(
        relevantPayments
          .map((payment) => payment.categoryId)
          .filter(
            (categoryId): categoryId is string =>
              typeof categoryId === "string" && categoryId.trim() !== ""
          )
      )
    );

    if (paymentCategoryIds.length > 0) {
      const transactionCategories = await db.TransactionCategory.findAll({
        where: {
          id: {
            [Op.in]: paymentCategoryIds,
          },
        },
        attributes: ["id", "name", "nameEn", "builtinIconName"],
      });

      for (const category of transactionCategories) {
        transactionCategoriesById.set(category.id, category);
      }
    }

    // Виртуальные платежи для выбранного периода
    const existingDatesBySeries = new Map<string, Set<string>>();
    const currencyBySeries = new Map<string, string>();
    for (const p of relevantPayments) {
      const seriesId = p.seriesId || null;
      if (!seriesId) continue;
      const dueStr: string = String(p.dueDate);
      if (!existingDatesBySeries.has(seriesId)) {
        existingDatesBySeries.set(seriesId, new Set<string>());
      }
      existingDatesBySeries.get(seriesId)!.add(dueStr);
      if (p.currency) {
        currencyBySeries.set(seriesId, normalizePaymentCurrency(p.currency));
      }
    }

    const seriesList = await getActiveRecurringSeriesWithCategory(userId);
    await loadSeriesCurrencies(userId, seriesList.map((series) => series.id), currencyBySeries);

    const virtualPayments: (StatsPayment & {
      userId: string;
      title: string;
      remind: boolean;
      seriesId: string;
      builtinIconName?: string | null;
      createdAt: string;
      updatedAt: string;
      isVirtual: boolean;
    })[] = [];
    const periodStart = new Date(periodStartString);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(periodEndString);
    periodEnd.setHours(23, 59, 59, 999);
    const todayDateOnly = new Date();
    todayDateOnly.setHours(0, 0, 0, 0);

    for (const series of seriesList) {
      try {
        if (!series.recurrenceRule) continue;

        const baseBoundaryStr: string =
          series.generatedUntil || series.startDate;
        // Начало генерации: следующий день после baseBoundary и не раньше начала периода
        const boundary = new Date(baseBoundaryStr);
        boundary.setHours(0, 0, 0, 0);
        boundary.setDate(boundary.getDate() + 1);
        const effectiveStart =
          boundary > periodStart ? new Date(boundary) : new Date(periodStart);

        // Конец генерации: конец периода, ограниченный концом серии (если задан)
        let effectiveEnd = new Date(periodEnd);
        if (series.recurrenceEndDate) {
          const endBySeries = new Date(series.recurrenceEndDate);
          endBySeries.setHours(23, 59, 59, 999);
          if (endBySeries < effectiveEnd) {
            effectiveEnd = endBySeries;
          }
        }

        if (effectiveStart > effectiveEnd) continue;

        const options = RRule.parseString(series.recurrenceRule as string);
        options.dtstart = normalizeDateToUTC(new Date(series.startDate));
        const rule = new RRule(options);

        const hits = rule.between(
          normalizeDateToUTC(effectiveStart),
          normalizeDateToUTC(effectiveEnd),
          true
        );

        const existing =
          existingDatesBySeries.get(series.id) || new Set<string>();
        for (const d of hits) {
          const dStr = d.toISOString().slice(0, 10);
          if (existing.has(dStr)) continue;
          const status =
            new Date(dStr) < todayDateOnly ? "overdue" : "upcoming";
          virtualPayments.push({
            id: `virtual:${series.id}:${dStr}`,
            userId: userId,
            title: series.title,
            amount: Number(series.amount),
            dueDate: dStr,
            status,
            remind: series.remind,
            seriesId: series.id,
            builtinIconName: series.builtinIconName,
            currency: currencyBySeries.get(series.id) || "RUB",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isVirtual: true,
            transactionCategory: series.transactionCategory
              ? {
                  id: series.transactionCategory.id,
                  name: series.transactionCategory.name,
                  nameEn: series.transactionCategory.nameEn,
                  builtinIconName:
                    series.transactionCategory.builtinIconName,
                }
              : null,
          });
        }
      } catch (e) {
        // Ошибки генерации конкретной серии не должны ломать расчет статистики
        logger.warn(
          `Failed to compute virtual occurrences for series ${series.id}`,
          e
        );
      }
    }

    const combinedPayments = [
      ...relevantPayments.map((payment) => ({
        ...payment.toJSON(),
        completedAt: payment.completedAt instanceof Date ? payment.completedAt : null,
        transactionCategory: payment.transactionCategory ||
          (payment.categoryId ? transactionCategoriesById.get(payment.categoryId) : null),
      })),
      ...virtualPayments,
    ];
    const incomes = await getIncomesForPeriod(userId, periodStartString, periodEndString);

    const incomeCategoryIds = Array.from(
      new Set(
        incomes
          .map((income) => income.categoryId)
          .filter(
            (categoryId): categoryId is string =>
              typeof categoryId === "string" && categoryId.trim() !== ""
          )
      )
    ).filter((categoryId) => !transactionCategoriesById.has(categoryId));

    if (incomeCategoryIds.length > 0) {
      const transactionCategories = await db.TransactionCategory.findAll({
        where: {
          id: {
            [Op.in]: incomeCategoryIds,
          },
        },
        attributes: ["id", "name", "nameEn", "builtinIconName"],
      });

      for (const category of transactionCategories) {
        transactionCategoriesById.set(category.id, category);
      }
    }

    const statsIncomes = incomes.map((income) => ({
      ...income.toJSON(),
      transactionCategory: income.transactionCategory ||
        (income.categoryId ? transactionCategoriesById.get(income.categoryId) : null),
    }));
    const today = formatInTimeZone(new Date(), userTimezone, "yyyy-MM-dd");
    // Исторические курсы нужны только для прошедших операций в чужой валюте.
    const rateDates = new Set<string>();
    for (const item of [...combinedPayments, ...statsIncomes.map((income) => ({ ...income, status: undefined }))]) {
      if (normalizePaymentCurrency(item.currency) === currency) continue;
      const rateDate = getRateDate(item, userTimezone, today);
      if (rateDate) rateDates.add(rateDate);
    }
    const ratesByDate = await getUsdRatesForDates(rateDates);

    return calculateDashboardStats(combinedPayments, statsIncomes, {
      startDate: periodStartString,
      endDate: periodEndString,
      timezone: userTimezone,
      currency,
      today,
      rates: { current: currentRates, byDate: ratesByDate },
    });
  } catch (error) {
    logger.error(
      `Error calculating dashboard stats for user ${userId}:`,
      error
    );
    throw new Error("Failed to calculate dashboard statistics.");
  }
};

// --- Фоновая задача: Очистка "осиротевших" серий ---
// Эта функция находит и удаляет записи о сериях, на которые не ссылается ни один платеж.
export const cleanupOrphanedSeries = async () => {
  logger.info("Running job: cleanupOrphanedSeries");
  try {
    // Находим все seriesId, которые используются в таблице платежей
    const usedSeriesIdsResult = await db.Payment.findAll({
      attributes: [
        [db.sequelize.fn("DISTINCT", db.sequelize.col("seriesId")), "seriesId"],
      ],
      where: {
        seriesId: {
          [Op.ne]: null,
        },
      },
      raw: true,
    });

    const usedSeriesIds = usedSeriesIdsResult.map((item: any) => item.seriesId);

    // Удаляем все серии, ID которых не находится в списке используемых
    const deletedCount = await deleteOrphanedSeries(usedSeriesIds);

    logger.info(`Cleaned up ${deletedCount} orphaned recurring series.`);
    return deletedCount;
  } catch (error) {
    logger.error("Error in cleanupOrphanedSeries cron job:", error);
    throw error; // Пробрасываем ошибку для логирования в cron runner
  }
};
