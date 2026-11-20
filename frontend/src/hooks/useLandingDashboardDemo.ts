import { useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import type { PaymentData } from "../types/paymentData";
import {
  getLandingDashboardPayments,
  getLandingPreviewCurrency,
  type LandingPreviewCurrency,
} from "../utils/landingPreviewData";

/** Демонстрационные данные для главной страницы приложения в предпросмотрах на публичных страницах. */
export interface LandingDashboardDemo {
  upcoming: PaymentData[];
  completed: PaymentData[];
  currency: LandingPreviewCurrency;
  today: Date;
}

/** Собирает демонстрационные платежи в валюте и на языке текущей локали. */
export function useLandingDashboardDemo(): LandingDashboardDemo {
  const { language, t } = useLanguage();
  return useMemo(() => {
    const currency = getLandingPreviewCurrency(language);
    const today = new Date();
    return { ...getLandingDashboardPayments(currency, t, today), currency, today };
  }, [language, t]);
}
