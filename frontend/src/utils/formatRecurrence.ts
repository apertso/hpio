// src/utils/formatRecurrence.ts
export const formatRecurrenceRule = (rule: string | undefined): string => {
  if (!rule) return "Разовый";
  if (rule.includes("FREQ=DAILY")) return "Ежедневно";
  if (rule.includes("FREQ=WEEKLY")) return "Еженедельно";
  if (rule.includes("FREQ=MONTHLY")) return "Ежемесячно";
  if (rule.includes("FREQ=YEARLY")) return "Ежегодно";
  return "Повторяющийся";
};
