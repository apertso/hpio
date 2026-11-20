// src/App.tsx
import { useLanguage } from './context/LanguageContext';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';

// Contexts
import { useAuth } from './context/AuthContext';
import { usePageTitle } from './context/PageTitleContext';
import { useToast } from './context/ToastContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import NotificationOnboardingModal from './components/NotificationOnboardingModal';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import OverlayScrollbar from './components/OverlayScrollbar';
import AppSidebar from './components/AppSidebar';
import { UiSurfaceContext } from './context/UiSurfaceContext';
import MobileNavigationDrawer from './components/MobileNavigationDrawer';
import VerificationBanner from './components/VerificationBanner';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { LandingTopBar } from './components/LandingTopBar';
import PublicLocaleSync from './components/PublicLocaleSync';
import {
  localizeHref,
  splitLocalePath,
  toEnglishPath,
} from './i18n/localePath';

// Icons
import {
  ArrowLeftIcon,
  Bars3Icon,
  PlusIcon,
} from '@heroicons/react/24/outline';

// Utilities & API
import axiosInstance from './api/axiosInstance';
import { isTauri, isTauriMobile } from './utils/platform';
import logger from './utils/logger';
import { trackNavigation } from './utils/breadcrumbs';
import {
  getPendingNotifications,
  clearPendingNotifications,
  checkNotificationPermission,
  PendingNotification,
} from './api/notificationPermission';
import { parseNotification } from './utils/notificationParser';
import { normalizeNotificationTimestamp } from './utils/dateUtils';
import { merchantRuleApi } from './api/merchantRuleApi';
import { notificationApi } from './api/notificationApi';
import {
  isIncomeAndCardsEnabled,
  isTagsAndCategoriesEnabled,
} from './utils/featureFlags';

// Lazy Pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const PaymentsPage = React.lazy(() => import('./pages/PaymentsPage'));
const CategoriesPage = React.lazy(() => import('./pages/CategoriesPage'));
const TagsPage = React.lazy(() => import('./pages/TagsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const PasswordResetPage = React.lazy(() => import('./pages/PasswordResetPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const PaymentEditPage = React.lazy(() => import('./pages/PaymentEditPage'));
const CategoryEditPage = React.lazy(() => import('./pages/CategoryEditPage'));
const TagEditPage = React.lazy(() => import('./pages/TagEditPage'));
const VerifyEmailPage = React.lazy(() => import('./pages/VerifyEmailPage'));
const TermsPage = React.lazy(() => import('./pages/TermsPage'));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const DownloadPage = React.lazy(() => import('./pages/DownloadPage'));
const BlogPage = React.lazy(() => import('./pages/BlogPage'));
const BlogPostPage = React.lazy(() => import('./pages/BlogPostPage'));
const CardsPage = React.lazy(() => import('./pages/CardsPage'));
const CardEditPage = React.lazy(() => import('./pages/CardEditPage'));
const IncomesPage = React.lazy(() => import('./pages/IncomesPage'));
const AutomationRulesPage = React.lazy(
  () => import('./pages/AutomationRulesPage'),
);

const NATIVE_NOTIFICATION_EVENT = 'hpio-native-notification';

// --- Main App Component ---

function App() {
  const { t, language } = useLanguage();
  const { isAuthenticated, user, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { pageTitle, headerAction, headerRightAction } = usePageTitle();
  const githubUrl = import.meta.env.VITE_GITHUB_URL;

  const incomeCardsEnabled = isIncomeAndCardsEnabled();
  const tagsAndCategoriesEnabled = isTagsAndCategoriesEnabled();
  const tagsEnabled = tagsAndCategoriesEnabled;
  const canManageCategories = Boolean(user?.isAdmin);

  const mobileNavItems = [
    { to: '/dashboard', label: t('Главная') },
    { to: '/payments', label: t('Платежи') },
    ...(canManageCategories
      ? [
          { to: '/categories', label: t('Категории') },
          { to: '/automation-rules', label: t('Автоматизация') },
        ]
      : []),
    ...(tagsEnabled ? [{ to: '/tags', label: t('Теги') }] : []),
    ...(incomeCardsEnabled
      ? [
          { to: '/incomes', label: t('Доходы') },
          { to: '/sources', label: t('Источники') },
        ]
      : []),
  ];

  // State
  const [showNotificationOnboarding, setShowNotificationOnboarding] =
    useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [processedNotificationKeys, setProcessedNotificationKeys] = useState<
    Set<string>
  >(() => {
    try {
      const stored = localStorage.getItem('processed_notification_keys');
      if (!stored) return new Set();
      return new Set(JSON.parse(stored));
    } catch (error) {
      logger.error('Failed to load processed notification keys:', error);
      return new Set();
    }
  });
  const isProcessingNotificationsRef = useRef(false);
  const processNotificationsRef = useRef<(() => Promise<void>) | null>(null);
  // Основной прокручиваемый контейнер — для тонкой полосы прокрутки поверх контента
  const [mainScrollEl, setMainScrollEl] = useState<HTMLElement | null>(null);

  // --- Logic: Mobile Safe Area ---
  useEffect(() => {
    const override = localStorage.getItem('dev_mobile_override');
    if (override === 'on') {
      document.documentElement.style.setProperty(
        '--safe-area-inset-top',
        '20px',
      );
      document.documentElement.style.setProperty(
        '--safe-area-inset-bottom',
        '20px',
      );
    } else {
      document.documentElement.style.removeProperty('--safe-area-inset-top');
      document.documentElement.style.removeProperty('--safe-area-inset-bottom');
    }
  }, []);

  // --- Logic: Notification Onboarding ---
  useEffect(() => {
    if (!isAuthenticated) return;

    const hasSeenOnboarding = localStorage.getItem(
      'notification_onboarding_completed',
    );
    const devForceShow = localStorage.getItem(
      'dev_show_notification_onboarding',
    );

    if (isTauriMobile() && (!hasSeenOnboarding || devForceShow === 'on')) {
      const timer = setTimeout(() => setShowNotificationOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('notification_onboarding_completed', 'true');
    setShowNotificationOnboarding(false);
  };

  // --- Logic: Notification Processing (Core) ---
  const createNotificationKey = (notification: PendingNotification): string =>
    `${notification.timestamp}_${notification.package_name}_${notification.text}`;

  const saveProcessedKeysToStorage = (keys: Set<string>) => {
    try {
      const keysArray = Array.from(keys);
      const trimmedKeys = keysArray.slice(-1000);
      localStorage.setItem(
        'processed_notification_keys',
        JSON.stringify(trimmedKeys),
      );
    } catch (error) {
      logger.error('Failed to save processed notification keys:', error);
    }
  };

  const processNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    if (localStorage.getItem('automation_enabled') === 'false') {
      logger.info('Notification automation disabled.');
      return;
    }

    // Mutex: предотвращает параллельную обработку уведомлений
    if (isProcessingNotificationsRef.current) {
      logger.info('Notification processing already in progress, skipping.');
      return;
    }
    isProcessingNotificationsRef.current = true;

    try {
      const devMobileOverride = localStorage.getItem('dev_mobile_override');
      const isActuallyTauri = isTauri();
      const shouldBypassPermissionCheck = devMobileOverride === 'on';

      if (!isActuallyTauri && !shouldBypassPermissionCheck) {
        return;
      }

      let notifications: PendingNotification[] = [];

      if (isActuallyTauri && !shouldBypassPermissionCheck) {
        const { granted } = await checkNotificationPermission();
        if (!granted) {
          logger.warn('Notification permission missing.');
          return;
        }
        notifications = await getPendingNotifications();
        notifications = notifications.filter(
          (n) => !n.notification_type || n.notification_type === 'PAYMENT',
        );
      }

      const unprocessedNotifications = notifications.filter(
        (n) => !processedNotificationKeys.has(createNotificationKey(n)),
      );

      if (unprocessedNotifications.length > 0) {
        const newKeys = new Set(processedNotificationKeys);
        let autoCreatedCount = 0;
        const successfullyProcessedKeys: string[] = [];

        for (const notification of unprocessedNotifications) {
          const notificationKey = createNotificationKey(notification);
          try {
            logger.info(
              `Processing notification from ${notification.package_name}`,
            );

            if (localStorage.getItem('dev_show_debug_toasts') === 'true') {
              showToast(
                `New notification: ${notification.package_name}`,
                'info',
                3000,
              );
            }

            const parsed = parseNotification(
              notification.package_name,
              notification.text,
              notification.title,
            );

            try {
              const combinedText = notification.title
                ? `${notification.title} ${notification.text}`
                : notification.text;
              await notificationApi.logTransactionNotification({
                text: combinedText,
                from: notification.package_name,
              });
            } catch {
              /* silent fail */
            }

            if (!parsed) {
              newKeys.add(notificationKey);
              successfullyProcessedKeys.push(notificationKey);
              continue;
            }

            const existingRule = await merchantRuleApi.findRuleByMerchant(
              parsed.merchantName,
            );

            const today = new Date().toISOString().split('T')[0];
            const completedAt = normalizeNotificationTimestamp(
              notification.timestamp,
            );

            try {
              const payload: Record<string, unknown> = {
                title: parsed.merchantName,
                amount: parsed.amount,
                dueDate: today,
                categoryId: existingRule ? existingRule.categoryId : null,
                createAsCompleted: true,
                autoCreated: true,
                notificationTimestamp: notification.timestamp,
              };
              if (completedAt) payload.completedAt = completedAt;

              logger.info(
                `Auto-creating payment: ${parsed.merchantName}, ${parsed.amount}, ts=${notification.timestamp}`,
              );

              await axiosInstance.post('/payments', payload);
              autoCreatedCount += 1;
            } catch (e) {
              logger.error('Auto-create failed', e);
              // We re-throw or handle here. If we want to retry auto-creation,
              // we should NOT add to successfullyProcessedKeys.
              // However, if the error is non-transient (e.g. 400 Bad Request), maybe we should mark as processed?
              // For now, assuming network/server errors are transient -> do not mark as processed.
              throw e;
            }
            newKeys.add(notificationKey);
            successfullyProcessedKeys.push(notificationKey);
          } catch (itemError) {
            logger.error(
              `Failed to process notification from ${notification.package_name}`,
              itemError,
            );
            // Do NOT add to successfullyProcessedKeys, so it remains in the file
          }
        }

        if (autoCreatedCount > 0) {
          showToast(
            t('Автоматически добавлено {1} платежей.', autoCreatedCount),
            'success',
          );
        }

        setProcessedNotificationKeys(newKeys);
        saveProcessedKeysToStorage(newKeys);

        if (
          isActuallyTauri &&
          !shouldBypassPermissionCheck &&
          successfullyProcessedKeys.length > 0
        ) {
          await clearPendingNotifications(successfullyProcessedKeys);
        }
      }
    } catch (error) {
      logger.error('Error in processNotifications:', error);
    } finally {
      isProcessingNotificationsRef.current = false;
    }
  }, [isAuthenticated, processedNotificationKeys, showToast, t]);

  // Храним актуальную версию processNotifications в ref для использования в useEffect
  processNotificationsRef.current = processNotifications;

  // --- Logic: Event Listeners ---
  useEffect(() => {
    if (!isAuthenticated) return;

    logger.info('App init: listeners active');

    if (isTauriMobile()) {
      import('./api/fcmApi').then(
        async ({ getPendingNavigation, clearPendingNavigation }) => {
          const action = await getPendingNavigation();
          if (action) {
            await clearPendingNavigation();
            if (action === 'archive') navigate('/payments?tab=archive');
            else if (action !== 'main') navigate('/dashboard');
          }
        },
      );
    }

    // Используем ref чтобы избежать бесконечного цикла useEffect
    processNotificationsRef.current?.();

    const handleNativeEvent = () => {
      logger.info('Native notification event');
      processNotificationsRef.current?.();
    };

    window.addEventListener(NATIVE_NOTIFICATION_EVENT, handleNativeEvent);

    let unlistenTauri: (() => void) | undefined;
    if (isTauri()) {
      import('@tauri-apps/api/event').then(async ({ listen }) => {
        unlistenTauri = await listen('payment-notification-received', () => {
          logger.info('Tauri event received');
          processNotificationsRef.current?.();
        });
      });
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible')
        processNotificationsRef.current?.();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener(NATIVE_NOTIFICATION_EVENT, handleNativeEvent);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (unlistenTauri) unlistenTauri();
    };
  }, [isAuthenticated, navigate]);

  // --- Mobile Floating Action Logic ---
  let mobileAddAction: (() => void) | null = null;
  let mobileActionIcon: React.ReactNode | null = null;
  let mobileActionAriaLabel: string | null = null;

  if (isAuthenticated) {
    if (location.pathname === '/dashboard') {
      mobileAddAction = () => navigate('/payments/new');
      mobileActionIcon = <PlusIcon className="h-6 w-6" />;
      mobileActionAriaLabel = 'Добавить';
    } else if (location.pathname === '/categories' && canManageCategories) {
      mobileAddAction = () => navigate('/categories/new');
      mobileActionIcon = <PlusIcon className="h-6 w-6" />;
      mobileActionAriaLabel = 'Добавить';
    } else if (location.pathname === '/tags') {
      mobileAddAction = () =>
        window.dispatchEvent(new CustomEvent('tags:create-request'));
      mobileActionIcon = <PlusIcon className="h-6 w-6" />;
      mobileActionAriaLabel = 'Тег';
    }
  }

  useEffect(() => {
    setIsMobileDrawerOpen(false);
    trackNavigation(location.pathname);
  }, [location.pathname]);

  const barePath = splitLocalePath(location.pathname).bare;
  const isTermsOrPrivacyPage = barePath === '/terms' || barePath === '/privacy';
  const isPublicAuthPage = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ].includes(barePath);
  // Индексируемые страницы сайта — у них собственный публичный дизайн
  const isIndexedPage =
    isTermsOrPrivacyPage ||
    ['/download', '/about', '/blog'].includes(barePath) ||
    barePath.startsWith('/blog/');
  const isPublicPage = isPublicAuthPage || isIndexedPage;
  const showPublicHeader = isPublicPage && !isAuthenticated && !isTauriMobile();

  const isLandingPage =
    barePath === '/' && !isAuthenticated && !isTauriMobile();

  // Рабочий интерфейс приложения: всё, кроме публичных страниц (включая вход/регистрацию) и лендинга
  const isAppUi = !isPublicPage && !isLandingPage;

  useEffect(() => {
    document.documentElement.classList.toggle('app-ui', isAppUi);
  }, [isAppUi]);

  const showHeader =
    !showPublicHeader &&
    !isPublicAuthPage &&
    !(isTauriMobile() && barePath === '/') &&
    !(isTauriMobile() && isTermsOrPrivacyPage) &&
    !isLandingPage;

  // Боковая панель — только для авторизованного рабочего интерфейса
  const showSidebar = isAuthenticated && showHeader && isAppUi;

  const isEditPage =
    isAuthenticated &&
    (location.pathname === '/payments/new' ||
      location.pathname.startsWith('/payments/edit/') ||
      location.pathname === '/categories/new' ||
      location.pathname.startsWith('/categories/edit/') ||
      location.pathname === '/tags/new' ||
      location.pathname.startsWith('/tags/edit/') ||
      location.pathname === '/sources/new' ||
      location.pathname.startsWith('/sources/edit/'));

  // --- Render Helpers ---

  const headerIconButtonClass =
    'flex size-9 items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-40 cursor-pointer';

  // Мобильная шапка авторизованного приложения
  const renderAppMobileHeader = (): React.JSX.Element => (
    <header className="md:hidden z-30 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[var(--ui-border)] bg-[var(--ui-bg)] px-1.5">
      <div className="flex min-w-0 items-center gap-1">
        {isEditPage ? (
          <button
            onClick={() => navigate(-1)}
            className={headerIconButtonClass}
            aria-label={t('Назад')}
          >
            <ArrowLeftIcon className="size-5" />
          </button>
        ) : (
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className={headerIconButtonClass}
            aria-label={t('Меню')}
          >
            <Bars3Icon className="size-5" />
          </button>
        )}
        {pageTitle && (
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-semibold text-gray-900 dark:text-gray-50">
              {pageTitle}
            </h1>
            {headerAction}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <SyncStatusIndicator />
        {headerRightAction}
        {mobileAddAction && mobileActionIcon && (
          <button
            onClick={mobileAddAction}
            className={headerIconButtonClass}
            aria-label={mobileActionAriaLabel || t('Действие')}
          >
            {mobileActionIcon}
          </button>
        )}
      </div>
    </header>
  );

  const renderFooter = (): React.JSX.Element => (
    <footer className="border-t border-gray-200 dark:border-gray-800 py-8 bg-white dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          {/* Копирайт и автор в одну строку; «by» одинаково для всех языков */}
          <p>
            © {t('Хочу Плачу')} · by{' '}
            <a
              href="https://apertso.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              apertso
            </a>
          </p>
        </div>

        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 font-medium">
          <Link
            to={localizeHref(language, '/terms')}
            className="cursor-pointer transition-opacity hover:opacity-80"
            aria-current={barePath === '/terms' ? 'page' : undefined}
          >
            {t('Соглашение')}
          </Link>
          <Link
            to={localizeHref(language, '/privacy')}
            className="cursor-pointer transition-opacity hover:opacity-80"
            aria-current={barePath === '/privacy' ? 'page' : undefined}
          >
            {t('Приватность')}
          </Link>
          <Link
            to={localizeHref(language, '/blog')}
            className="cursor-pointer transition-opacity hover:opacity-80"
            aria-current={barePath === '/blog' ? 'page' : undefined}
          >
            {t('Блог')}
          </Link>
          <Link
            to={localizeHref(language, '/about')}
            className="cursor-pointer transition-opacity hover:opacity-80"
            aria-current={barePath === '/about' ? 'page' : undefined}
          >
            {t('О нас')}
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.758-1.333-1.758-1.09-.744.082-.729.082-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.833 2.805 1.303 3.49.997.108-.775.418-1.303.76-1.603-2.665-.303-5.466-1.333-5.466-5.93 0-1.31.47-2.38 1.235-3.22-.124-.303-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.403 2.29-1.552 3.297-1.23 3.297-1.30.655 1.653.243 2.873.12 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.804 5.625-5.476 5.922.43.372.813 1.102.813 2.222 0 1.606-.015 2.902-.015 3.296 0 .32.217.694.825.576C20.565 21.796 24 17.3 24 12c0-6.63-5.37-12-12-12Z" />
              </svg>
            </a>
          )}
          {!isAuthenticated && !showPublicHeader && <ThemeSwitcher />}
        </div>
      </div>
    </footer>
  );

  // --- Render Layout ---
  const layoutClasses = `relative flex h-dvh overflow-hidden ${
    showSidebar ? 'flex-row' : 'flex-col'
  } ${
    isPublicPage
      ? 'public-surface'
      : isLandingPage
        ? 'font-sans bg-transparent'
        : 'font-sans bg-[var(--ui-bg)] text-gray-900 dark:text-gray-100'
  } ${isTauriMobile() ? 'safe-area-top safe-area-bottom' : ''}`;
  // Enforce min-h-0 to allow scrolling within flex container
  const mainClasses = `flex flex-col flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden scroll-smooth overlay-scroll`;
  // Футер нужен только публичным страницам и гостям; в рабочем интерфейсе его нет
  const showFooter =
    !isTauriMobile() && !isPublicAuthPage && !(isAuthenticated && isAppUi);

  const routes = (
    <Routes>
      {/* Public Routes. Русские адреса без префикса, английские под /en. */}
      {[false, true].flatMap((english) => {
        const path = (bare: string): string =>
          english ? toEnglishPath(bare) : bare;
        return [
          <Route
            key={path('/')}
            path={path('/')}
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : isTauriMobile() ? (
                <Navigate to="/login" replace />
              ) : (
                <LandingPage />
              )
            }
          />,
          <Route
            key={path('/terms')}
            path={path('/terms')}
            element={<TermsPage />}
          />,
          <Route
            key={path('/privacy')}
            path={path('/privacy')}
            element={<PrivacyPage />}
          />,
          <Route
            key={path('/about')}
            path={path('/about')}
            element={<AboutPage />}
          />,
          <Route
            key={path('/download')}
            path={path('/download')}
            element={<DownloadPage />}
          />,
          <Route
            key={path('/blog')}
            path={path('/blog')}
            element={<BlogPage />}
          />,
          <Route
            key={path('/blog/:slug')}
            path={path('/blog/:slug')}
            element={<BlogPostPage />}
          />,
        ];
      })}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<PasswordResetPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/payments/new" element={<PaymentEditPage />} />
        <Route path="/payments/edit/:id" element={<PaymentEditPage />} />
        {canManageCategories && (
          <>
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/categories/new" element={<CategoryEditPage />} />
            <Route path="/categories/edit/:id" element={<CategoryEditPage />} />
            <Route path="/automation-rules" element={<AutomationRulesPage />} />
          </>
        )}
        {tagsEnabled && (
          <>
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/tags/new" element={<TagEditPage />} />
            <Route path="/tags/edit/:id" element={<TagEditPage />} />
          </>
        )}
        <Route path="/settings" element={<SettingsPage />} />
        {incomeCardsEnabled && (
          <>
            <Route path="/sources" element={<CardsPage />} />
            <Route path="/sources/new" element={<CardEditPage />} />
            <Route path="/sources/edit/:id" element={<CardEditPage />} />
            <Route path="/incomes" element={<IncomesPage />} />
          </>
        )}
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );

  const mainContent = (
    <div className="relative flex min-h-0 w-full flex-1 flex-col">
    <main
      ref={setMainScrollEl}
      className={`${mainClasses} motion-reduce:scroll-auto`}
      key={isPublicPage ? location.pathname : undefined}
    >
      {routes}

      {/* Footer acts as a spacer in the scroll view for mobile, or real footer on desktop */}
      {showFooter && (
        <div className={isPublicPage ? 'mt-auto' : 'mt-auto pt-10'}>
          {renderFooter()}
        </div>
      )}
    </main>
    <OverlayScrollbar target={mainScrollEl} />
    </div>
  );

  return (
    <UiSurfaceContext.Provider value={isAppUi ? 'app' : 'public'}>
    <div className={layoutClasses}>
      <PublicLocaleSync />

      {showSidebar ? (
        <>
          <AppSidebar />
          {/* Рабочая область: на десктопе — приподнятая панель с тонкой рамкой */}
          <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
            {renderAppMobileHeader()}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:rounded-lg md:border md:border-[var(--ui-border)] md:bg-[var(--ui-surface)] md:shadow-sm">
              <VerificationBanner />
              {mainContent}
            </div>
          </div>
        </>
      ) : (
        <>
          {showPublicHeader && (
            <div className="shrink-0 border-b border-gray-200/80 dark:border-white/10">
              <div className="public-container">
                <LandingTopBar showSignIn={!isPublicAuthPage} />
              </div>
            </div>
          )}
          <VerificationBanner />
          {mainContent}
        </>
      )}

      {/* Global Modals */}
      <NotificationOnboardingModal
        isOpen={showNotificationOnboarding}
        onClose={() => setShowNotificationOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
      <MobileNavigationDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        onOpen={() => setIsMobileDrawerOpen(true)}
        user={user}
        token={token}
        navItems={mobileNavItems}
        currentPath={location.pathname}
        onLogout={logout}
        gesturesEnabled={showHeader}
      />
    </div>
    </UiSurfaceContext.Provider>
  );
}

export default App;
