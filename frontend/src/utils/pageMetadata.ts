import { PageMetaProps } from "../components/PageMeta";

export interface PageConfig
  extends Omit<PageMetaProps, "title" | "description"> {
  title?: string;
  description?: string;
}

// Base configuration for all pages
const baseConfig = {
  ogType: "website" as const,
};

// Configuration for public pages
const publicConfig = {
  ...baseConfig,
  robots: "index, follow",
};

// Configuration for private/authenticated pages
const privateConfig = {
  ...baseConfig,
  robots: "noindex, nofollow",
};

// Page metadata configurations
export const pageMetadata: Record<string, PageConfig> = {
  // Public pages
  landing: {
    ...publicConfig,
    description:
      "Следите за регулярными платежами, подписками и кредитами. Бесплатное приложение с уведомлениями и анализом расходов - начните вести финансы онлайн!",
    canonical: "https://hpio.ru/",
    ogTitle: "Сервис для учёта расходов и напоминаний о платежах",
    ogDescription:
      "Не забывайте о важных платежах! Учет расходов, напоминания о подписках и кредитах, анализ финансов - всё в одном приложении.",
    isLandingPage: true,
  },

  download: {
    ...publicConfig,
    title: "Скачать приложение - Хочу Плачу",
    description:
      "Скачайте мобильное приложение Хочу Плачу для Android. Управляйте финансами на ходу с удобным мобильным интерфейсом.",
    canonical: "https://hpio.ru/download",
    ogTitle: "Скачать мобильное приложение Хочу Плачу",
    ogDescription:
      "Управляйте финансами где угодно! Скачайте приложение для Android и получите доступ ко всем функциям на мобильном устройстве.",
  },

  login: {
    ...publicConfig,
    robots: "noindex, nofollow",
    ogTitle: "Вход в аккаунт",
    ogDescription:
      "Войдите в свой аккаунт Хочу Плачу для управления платежами и контроля расходов.",
  },

  register: {
    ...publicConfig,
    robots: "noindex, nofollow",
    ogTitle: "Регистрация",
    ogDescription:
      "Создайте бесплатный аккаунт в Хочу Плачу и начните контролировать свои расходы и платежи уже сегодня.",
  },

  terms: {
    ...publicConfig,
    canonical: "https://hpio.ru/terms",
    ogTitle: "Пользовательское соглашение",
    ogDescription:
      "Условия использования сервиса Хочу Плачу для управления финансами и платежами.",
  },

  privacy: {
    ...publicConfig,
    canonical: "https://hpio.ru/privacy",
    ogTitle: "Политика конфиденциальности",
    ogDescription:
      "Информация о том, как мы защищаем ваши данные и обеспечиваем конфиденциальность в Хочу Плачу.",
  },

  about: {
    ...publicConfig,
    canonical: "https://hpio.ru/about",
    ogTitle: "О проекте",
    ogDescription:
      "История создания и цели сервиса для управления личными финансами и контроля расходов.",
  },

  // Private pages
  dashboard: {
    ...privateConfig,
    ogTitle: "Панель управления",
    ogDescription:
      "Контролируйте свои расходы, отслеживайте платежи и анализируйте финансовую статистику.",
  },

  payments: {
    ...privateConfig,
    ogTitle: "Управление платежами",
    ogDescription:
      "Полный список ваших платежей с возможностью редактирования и контроля.",
  },

  categories: {
    ...privateConfig,
    ogTitle: "Категории",
    ogDescription:
      "Создавайте и управляйте категориями для эффективной организации ваших расходов.",
  },

  archive: {
    ...privateConfig,
    ogTitle: "Архив платежей",
    ogDescription:
      "История всех ваших финансовых операций и выполненных платежей.",
  },

  settings: {
    ...privateConfig,
    ogTitle: "Настройки",
    ogDescription:
      "Персонализируйте свой опыт использования сервиса управления финансами.",
  },

  account: {
    ...privateConfig,
    ogTitle: "Аккаунт",
    ogDescription:
      "Управляйте настройками своего профиля, паролем и аккаунтом.",
  },

  "forgot-password": {
    ...privateConfig,
    ogTitle: "Восстановление пароля",
    ogDescription: "Восстановите доступ к своему аккаунту Хочу Плачу.",
  },

  "reset-password": {
    ...privateConfig,
    ogTitle: "Сброс пароля",
    ogDescription: "Создайте новый надежный пароль для вашего аккаунта.",
  },

  "verify-email": {
    ...privateConfig,
    ogTitle: "Подтверждение email",
    ogDescription:
      "Подтвердите ваш email для получения уведомлений о платежах.",
  },

  // 404 page
  "404": {
    ...privateConfig,
    ogTitle: "Страница не найдена",
    ogDescription:
      "Запрашиваемая страница не существует. Перейдите на главную страницу сервиса.",
  },
};

// Helper function to get page metadata
export const getPageMetadata = (pageKey: string): PageConfig => {
  return pageMetadata[pageKey] || pageMetadata["404"];
};
