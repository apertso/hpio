// src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

// Contexts
import { useAuth } from './context/AuthContext';
import { useReset } from './context/ResetContext';
import { usePageTitle } from './context/PageTitleContext';
import { useToast } from './context/ToastContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import NotificationOnboardingModal from './components/NotificationOnboardingModal';
import Overlay from './components/Overlay';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import MobileNavigationDrawer from './components/MobileNavigationDrawer';
import FeedbackWidget from './components/FeedbackWidget';
import VerificationBanner from './components/VerificationBanner';
import { ThemeSwitcher } from './components/ThemeSwitcher';

// Icons
import {
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftIcon,
  UserIcon,
  Bars3Icon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

// Utilities & API
import axiosInstance from './api/axiosInstance';
import { useDropdown } from './hooks/useDropdown';
import { useAvatarCache } from './hooks/useAvatarCache';
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

// --- Helper Components ---

const Navigation: React.FC = () => {
  const { isAuthenticated, user, logout, token } = useAuth();
  const location = useLocation();
  const {
    isOpen: isUserPopoverOpen,
    setIsOpen: setIsUserPopoverOpen,
    containerRef: popoverRef,
  } = useDropdown();
  const { avatarUrl } = useAvatarCache(user?.photoPath, token);
  const incomeCardsEnabled = isIncomeAndCardsEnabled();
  const tagsAndCategoriesEnabled = isTagsAndCategoriesEnabled();
  const tagsEnabled = tagsAndCategoriesEnabled;
  const canManageCategories = Boolean(user?.isAdmin);

  const authPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
  ];
  if (authPaths.includes(location.pathname)) {
    return null;
  }

  const navLinkClass = (isActive: boolean) =>
    `text-sm font-medium transition-opacity duration-200 hover:opacity-80 ${
      isActive
        ? 'text-black dark:text-white'
        : 'text-gray-600 dark:text-gray-400'
    }`;

  return (
    <nav className="flex items-center gap-2 sm:gap-6">
      {isAuthenticated ? (
        <>
          <div className="hidden md:flex items-center gap-8 mr-4">
            <Link
              to="/dashboard"
              className={navLinkClass(location.pathname === '/dashboard')}
            >
              Главная
            </Link>
            <Link
              to="/payments"
              className={navLinkClass(
                location.pathname.startsWith('/payments'),
              )}
            >
              Платежи
            </Link>
            {canManageCategories && (
              <Link
                to="/categories"
                className={navLinkClass(
                  location.pathname.startsWith('/categories'),
                )}
              >
                Категории
              </Link>
            )}
            {canManageCategories && (
              <Link
                to="/automation-rules"
                className={navLinkClass(
                  location.pathname.startsWith('/automation-rules'),
                )}
              >
                Автоматизация
              </Link>
            )}
            {tagsEnabled && (
              <Link
                to="/tags"
                className={navLinkClass(location.pathname.startsWith('/tags'))}
              >
                Теги
              </Link>
            )}
            {incomeCardsEnabled && (
              <>
                <Link
                  to="/incomes"
                  className={navLinkClass(
                    location.pathname.startsWith('/incomes'),
                  )}
                >
                  Доходы
                </Link>
                <Link
                  to="/sources"
                  className={navLinkClass(
                    location.pathname.startsWith('/sources'),
                  )}
                >
                  Источники
                </Link>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-gray-700">
            <ThemeSwitcher />
            <FeedbackWidget />
          </div>

          <div className="hidden md:flex items-center pl-2">
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setIsUserPopoverOpen(!isUserPopoverOpen)}
                className="flex items-center justify-center rounded-full hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
                aria-label="Меню пользователя"
                aria-expanded={isUserPopoverOpen}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="User Avatar"
                    className="size-9 rounded-full object-cover bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 size-9 shadow-sm">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>

              <Overlay
                isOpen={isUserPopoverOpen}
                widthClass="w-72"
                anchorRef={popoverRef}
                offset={12}
              >
                <div role="menu" aria-orientation="vertical">
                  {(user?.email || user?.name) && (
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                      {user.name && (
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {user.name}
                        </p>
                      )}
                      {user.email && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {user.email}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="p-1">
                    <Link
                      to="/settings"
                      onClick={() => setIsUserPopoverOpen(false)}
                      className="w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 px-3 py-2 rounded-md transition-colors flex items-center text-sm cursor-pointer"
                      role="menuitem"
                    >
                      <Cog6ToothIcon className="mr-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      Настройки
                    </Link>
                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                    <button
                      onClick={() => {
                        logout();
                        setIsUserPopoverOpen(false);
                      }}
                      className="w-full text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-md transition-colors flex items-center text-sm cursor-pointer"
                      role="menuitem"
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4 opacity-70" />
                      Выйти
                    </button>
                  </div>
                </div>
              </Overlay>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="flex items-center gap-2 text-sm font-medium text-gray-800 transition-opacity hover:opacity-80 dark:text-gray-200"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            <span>Войти</span>
          </Link>
          <ThemeSwitcher />
        </div>
      )}
    </nav>
  );
};

// --- Main App Component ---

function App() {
  const { isAuthenticated, user, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { triggerReset } = useReset();
  const { showToast } = useToast();
  const { pageTitle, headerAction, headerRightAction } = usePageTitle();
  const githubUrl = import.meta.env.VITE_GITHUB_URL;

  const incomeCardsEnabled = isIncomeAndCardsEnabled();
  const tagsAndCategoriesEnabled = isTagsAndCategoriesEnabled();
  const tagsEnabled = tagsAndCategoriesEnabled;
  const canManageCategories = Boolean(user?.isAdmin);

  const mobileNavItems = [
    { to: '/dashboard', label: 'Главная' },
    { to: '/payments', label: 'Платежи' },
    ...(canManageCategories
      ? [
          { to: '/categories', label: 'Категории' },
          { to: '/automation-rules', label: 'Автоматизация' },
        ]
      : []),
    ...(tagsEnabled ? [{ to: '/tags', label: 'Теги' }] : []),
    ...(incomeCardsEnabled
      ? [
          { to: '/incomes', label: 'Доходы' },
          { to: '/sources', label: 'Источники' },
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
  const [canClearTrash, setCanClearTrash] = useState(false);
  const isProcessingNotificationsRef = useRef(false);
  const processNotificationsRef = useRef<(() => Promise<void>) | null>(null);

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
            `Автоматически добавлено ${autoCreatedCount} платежей.`,
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
  }, [isAuthenticated, processedNotificationKeys, showToast]);

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

  // --- Logic: Handlers ---
  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetUrl = isAuthenticated ? '/dashboard' : '/';
    if (isAuthenticated && location.pathname === targetUrl) {
      triggerReset();
    } else {
      navigate(targetUrl);
    }
  };

  useEffect(() => {
    const handler = (e: Event & { detail?: { hasItems?: boolean } }) => {
      setCanClearTrash(Boolean(e.detail?.hasItems));
    };
    window.addEventListener('payments:trash-state', handler as EventListener);
    return () =>
      window.removeEventListener(
        'payments:trash-state',
        handler as EventListener,
      );
  }, []);

  // --- Mobile Floating Action Logic ---
  let mobileAddAction: (() => void) | null = null;
  let mobileActionIcon: React.ReactNode | null = null;
  let mobileActionAriaLabel: string | null = null;
  let mobileActionDisabled = false;

  if (isAuthenticated) {
    if (location.pathname === '/dashboard') {
      mobileAddAction = () => navigate('/payments/new');
      mobileActionIcon = <PlusIcon className="h-6 w-6" />;
      mobileActionAriaLabel = 'Добавить';
    } else if (location.pathname === '/payments') {
      const currentTab = searchParams.get('tab') || 'active';
      if (currentTab === 'trash') {
        mobileAddAction = () =>
          window.dispatchEvent(new CustomEvent('payments:clear-trash-request'));
        mobileActionIcon = <TrashIcon className="h-6 w-6" />;
        mobileActionAriaLabel = 'Очистить корзину';
        mobileActionDisabled = !canClearTrash;
      } else if (currentTab === 'archive') {
        mobileAddAction = () => navigate('/payments/new?markAsCompleted=true');
        mobileActionIcon = <PlusIcon className="h-6 w-6" />;
        mobileActionAriaLabel = 'Добавить';
      } else {
        mobileAddAction = () => navigate('/payments/new');
        mobileActionIcon = <PlusIcon className="h-6 w-6" />;
        mobileActionAriaLabel = 'Добавить';
      }
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

  const isTermsOrPrivacyPage =
    location.pathname === '/terms' || location.pathname === '/privacy';
  const isPublicAuthPage = ['/login', '/register', '/forgot-password'].includes(
    location.pathname,
  );

  const isLandingPage =
    location.pathname === '/' && !isAuthenticated && !isTauriMobile();

  const showHeader =
    !isPublicAuthPage &&
    !(isTauriMobile() && location.pathname === '/') &&
    !(isTauriMobile() && isTermsOrPrivacyPage) &&
    !isLandingPage;

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

  const Header = () => (
    <header className="flex flex-shrink-0 items-center justify-between whitespace-nowrap border-b border-gray-200/80 bg-white/80 px-3 py-3 backdrop-blur-xl transition-colors duration-300 dark:border-gray-800/80 dark:bg-gray-900/80 sm:px-6 md:px-8 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {isAuthenticated && isEditPage ? (
          <>
            <button
              onClick={() => navigate(-1)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              aria-label="Назад"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            {pageTitle && (
              <div className="md:hidden flex items-center gap-2 min-w-0">
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                  {pageTitle}
                </h1>
                {headerAction}
              </div>
            )}
          </>
        ) : isAuthenticated && !isEditPage ? (
          <>
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              aria-label="Меню"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            {pageTitle && (
              <div className="md:hidden flex items-center gap-2 min-w-0">
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                  {pageTitle}
                </h1>
                {headerAction}
              </div>
            )}
          </>
        ) : null}

        <a
          href={isAuthenticated ? '/dashboard' : '/'}
          onClick={handleLogoClick}
          className={`flex items-center gap-3 group focus-visible:outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
            !isAuthenticated && !isTauriMobile() ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div className="size-4 text-black dark:text-white transition-transform group-hover:scale-105">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z"
                fill="currentColor"
              ></path>
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight transition-opacity group-hover:opacity-80">
            Хочу Плачу
          </span>
        </a>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <SyncStatusIndicator />
        <Navigation />

        <div className="md:hidden flex items-center gap-2">
          {headerRightAction}
          {mobileAddAction && mobileActionIcon && (
            <button
              onClick={mobileAddAction}
              disabled={mobileActionDisabled}
              className="p-2 rounded-full text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none disabled:opacity-50"
              aria-label={mobileActionAriaLabel || 'Действие'}
            >
              {mobileActionIcon}
            </button>
          )}
        </div>
      </div>
    </header>
  );

  const Footer = () => (
    <footer className="border-t border-gray-200 dark:border-gray-800 py-8 bg-white dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <p>
            Создано{' '}
            <a
              href="https://linkedin.com/in/artur-pertsev/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              apertso
            </a>{' '}
          </p>
        </div>

        <nav className="flex gap-6 font-medium">
          <Link
            to="/terms"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            Соглашение
          </Link>
          <Link
            to="/privacy"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            Приватность
          </Link>
          <Link
            to="/blog"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            Блог
          </Link>
          <Link
            to="/about"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            О нас
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
          {!isAuthenticated && (
            <>
              <ThemeSwitcher />
              <FeedbackWidget />
            </>
          )}
        </div>
      </div>
    </footer>
  );

  // --- Render Layout ---
  const layoutClasses = `relative flex h-dvh flex-col font-sans overflow-hidden transition-colors duration-300 ${
    isLandingPage ? 'bg-transparent' : 'bg-gray-50 dark:bg-dark-bg'
  } ${isTauriMobile() ? 'safe-area-top safe-area-bottom' : ''}`;
  // Enforce min-h-0 to allow scrolling within flex container
  const mainClasses = `flex flex-col flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden scroll-smooth`;

  return (
    <div className={layoutClasses}>
      {showHeader && <Header />}

      <VerificationBanner />

      <main className={mainClasses}>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : isTauriMobile() ? (
                <Navigate to="/login" replace />
              ) : (
                <LandingPage />
              )
            }
          />
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<PasswordResetPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />

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
                <Route
                  path="/categories/edit/:id"
                  element={<CategoryEditPage />}
                />
                <Route
                  path="/automation-rules"
                  element={<AutomationRulesPage />}
                />
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

        {/* Footer acts as a spacer in the scroll view for mobile, or real footer on desktop */}
        {!isTauriMobile() &&
          location.pathname !== '/login' &&
          location.pathname !== '/register' && (
            <div className="mt-auto pt-10">
              <Footer />
            </div>
          )}
      </main>

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
  );
}

export default App;
