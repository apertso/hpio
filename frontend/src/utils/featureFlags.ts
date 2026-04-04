/**
 * Утилита фич-флагов для экспериментальных возможностей
 * Флаги хранятся в localStorage, значения по умолчанию заданы в DEFAULT_FLAGS
 */

const FEATURE_FLAGS_KEY = "feature_flags";

export interface FeatureFlags {
  incomeAndCardsEnabled: boolean;
  tagsAndCategoriesEnabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  incomeAndCardsEnabled: false,
  tagsAndCategoriesEnabled: true,
};

export function getFeatureFlags(): FeatureFlags {
  if (typeof window === "undefined") {
    return DEFAULT_FLAGS;
  }

  try {
    const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
    if (!stored) {
      return DEFAULT_FLAGS;
    }
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_FLAGS;
    }
    const record = parsed as Record<string, unknown>;
    const incomeAndCardsEnabled = record.incomeAndCardsEnabled === true;
    const tagsAndCategoriesEnabled =
      record.tagsAndCategoriesEnabled === false
        ? false
        : DEFAULT_FLAGS.tagsAndCategoriesEnabled;
    return { ...DEFAULT_FLAGS, incomeAndCardsEnabled, tagsAndCategoriesEnabled };
  } catch {
    return DEFAULT_FLAGS;
  }
}

export function setFeatureFlag<K extends keyof FeatureFlags>(
  key: K,
  value: FeatureFlags[K]
): void {
  const current = getFeatureFlags();
  const updated = { ...current, [key]: value };
  localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(updated));
}

export function isIncomeAndCardsEnabled(): boolean {
  return getFeatureFlags().incomeAndCardsEnabled;
}

export function isTagsAndCategoriesEnabled(): boolean {
  return getFeatureFlags().tagsAndCategoriesEnabled;
}
