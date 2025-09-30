// src/App.tsx
import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useTheme } from "./context/ThemeContext";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import { useDropdown } from "./hooks/useDropdown";
import DropdownOverlay from "./components/DropdownOverlay";
import {
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import axiosInstance from "./api/axiosInstance";
import { PHOTO_URL } from "./api/userApi";
import { useReset } from "./context/ResetContext";
import { isTauriMobile } from "./utils/platform";
import { getPageBackgroundClasses } from "./utils/pageBackgrounds";

// Replace static page imports with lazy imports
const HomePage = React.lazy(() => import("./pages/HomePage"));
const PaymentsPage = React.lazy(() => import("./pages/PaymentsPage"));
const CategoriesPage = React.lazy(() => import("./pages/CategoriesPage"));
const ArchivePage = React.lazy(() => import("./pages/ArchivePage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const RegisterPage = React.lazy(() => import("./pages/RegisterPage"));
const PasswordResetPage = React.lazy(() => import("./pages/PasswordResetPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const MobileLandingPage = React.lazy(() => import("./pages/MobileLandingPage"));
const NotFoundPage = React.lazy(() => import("./pages/NotFoundPage"));
const PaymentEditPage = React.lazy(() => import("./pages/PaymentEditPage"));
const CategoryEditPage = React.lazy(() => import("./pages/CategoryEditPage"));
const VerifyEmailPage = React.lazy(() => import("./pages/VerifyEmailPage"));
const TermsPage = React.lazy(() => import("./pages/TermsPage"));
const PrivacyPage = React.lazy(() => import("./pages/PrivacyPage"));
const AboutPage = React.lazy(() => import("./pages/AboutPage"));
const DownloadPage = React.lazy(() => import("./pages/DownloadPage"));

const VerificationBanner = React.lazy(
  () => import("./components/VerificationBanner")
);
const FeedbackWidget = React.lazy(() => import("./components/FeedbackWidget"));

const ThemeSwitcher = () => {
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
      aria-label="Переключить тему"
    >
      {resolvedTheme === "light" ? (
        <MoonIcon className="h-5 w-5" />
      ) : (
        <SunIcon className="h-5 w-5" />
      )}
    </button>
  );
};

// Компонент навигации, который зависит от статуса аутентификации
const Navigation: React.FC = () => {
  const { isAuthenticated, user, logout, token } = useAuth();
  const location = useLocation();
  const {
    isOpen: isUserPopoverOpen,
    setIsOpen: setIsUserPopoverOpen,
    containerRef: popoverRef,
  } = useDropdown();
  const {
    isOpen: isMobileMenuOpen,
    setIsOpen: setIsMobileMenuOpen,
    containerRef: mobileMenuRef,
  } = useDropdown();
  const [avatarKey, setAvatarKey] = useState(Date.now());

  useEffect(() => {
    // Обновляем ключ при изменении фото, чтобы `img` перезагрузился
    setAvatarKey(Date.now());
  }, [user?.photoPath]);

  // На страницах аутентификации показываем только переключатель темы
  const authPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ];
  if (authPaths.includes(location.pathname)) {
    return;
  }

  return (
    <nav className="flex items-center gap-2 sm:gap-8">
      {isAuthenticated ? (
        <>
          <div className="hidden md:flex items-center gap-9">
            <Link
              to="/dashboard"
              className="text-black dark:text-white text-sm font-medium leading-normal"
            >
              Главная
            </Link>
            <Link
              to="/payments"
              className="text-black dark:text-white text-sm font-medium leading-normal"
            >
              Список платежей
            </Link>
            <Link
              to="/archive"
              className="text-black dark:text-white text-sm font-medium leading-normal"
            >
              Архив
            </Link>
            <Link
              to="/categories"
              className="text-black dark:text-white text-sm font-medium leading-normal"
            >
              Категории
            </Link>
          </div>
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="md:hidden relative" ref={mobileMenuRef}>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-card-bg text-gray-800 dark:text-gray-200"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <DropdownOverlay
                isOpen={isMobileMenuOpen}
                align="right"
                widthClass="w-56"
                anchorRef={mobileMenuRef}
              >
                <div className="py-1">
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Главная
                  </Link>
                  <Link
                    to="/payments"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Список платежей
                  </Link>
                  <Link
                    to="/archive"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Архив
                  </Link>
                  <Link
                    to="/categories"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Категории
                  </Link>
                </div>
              </DropdownOverlay>
            </div>
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setIsUserPopoverOpen(!isUserPopoverOpen)}
                className="flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-card-bg focus:outline-none cursor-pointer"
                aria-label="Открыть меню пользователя"
                aria-expanded={isUserPopoverOpen}
              >
                {user?.photoPath ? (
                  <img
                    key={avatarKey}
                    src={`${axiosInstance.defaults.baseURL}${PHOTO_URL}?token=${token}`}
                    alt="User Avatar"
                    className="size-10 rounded-full object-cover bg-gray-300 dark:bg-card-bg"
                  />
                ) : (
                  <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 size-10 shadow-sm">
                    <UserIcon className="w-6 h-6 text-white" />
                  </div>
                )}
              </button>

              <DropdownOverlay
                isOpen={isUserPopoverOpen}
                align="right"
                widthClass="w-72"
                anchorRef={popoverRef}
              >
                <div
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                >
                  {(user?.email || user?.name) && (
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                      {user.name && (
                        <p className="text-base font-semibold text-gray-800 dark:text-slate-200 truncate mb-1">
                          {user.name}
                        </p>
                      )}
                      {user.email && (
                        <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="py-2 px-4">
                    <Link
                      to="/settings"
                      onClick={() => setIsUserPopoverOpen(false)}
                      className="w-full text-left text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 py-1.5 px-3 rounded-md transition-colors flex items-center text-sm cursor-pointer"
                      role="menuitem"
                    >
                      <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-500 dark:text-slate-400" />
                      Настройки
                    </Link>
                  </div>
                  <div className="py-2 px-4 border-t border-gray-200 dark:border-slate-700">
                    <button
                      onClick={() => {
                        logout();
                        setIsUserPopoverOpen(false);
                      }}
                      className="w-full text-left text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 py-1.5 px-3 rounded-md transition-colors flex items-center text-sm font-medium cursor-pointer"
                      role="menuitem"
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-red-500" />
                      Выйти
                    </button>
                  </div>
                </div>
              </DropdownOverlay>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Войти</span>
          </Link>
        </div>
      )}
    </nav>
  );
};

function App() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerReset } = useReset();
  const githubUrl = import.meta.env.VITE_GITHUB_URL;

  // Set safe area inset for mobile development override
  useEffect(() => {
    const override = localStorage.getItem("dev_mobile_override");
    if (override === "on") {
      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        "20px"
      );
    } else {
      document.documentElement.style.removeProperty("--safe-area-inset-top");
    }
  }, []);

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetUrl = isAuthenticated ? "/dashboard" : "/";

    if (isAuthenticated && location.pathname === targetUrl) {
      triggerReset();
    } else {
      navigate(targetUrl);
    }
  };

  const headerClassName = `flex flex-shrink-0 items-center justify-between whitespace-nowrap border-b border-solid border-gray-300 dark:border-border-dark px-4 sm:px-10 py-3 z-20`;

  const header = (
    <header className={headerClassName}>
      <a
        href={isAuthenticated ? "/dashboard" : "/"}
        onClick={handleLogoClick}
        className="flex items-center gap-4 text-black dark:text-white hover:opacity-80 transition-opacity"
        style={{ textDecoration: "none" }}
      >
        <div className="size-4 text-black dark:text-white">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
        <div className="text-lg font-bold leading-tight tracking-[-0.015em]">
          Хочу Плачу
        </div>
      </a>
      <Navigation /> {/* Используем компонент навигации */}
    </header>
  );

  const mainClassName =
    "flex flex-col flex-1 justify-center overflow-auto" +
    (isTauriMobile() && location.pathname === "/" ? "" : " px-4 sm:px-10 py-5");

  const mainContent = (
    <main className={mainClassName}>
      <div className="flex flex-col flex-1 w-full">
        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={isTauriMobile() ? <MobileLandingPage /> : <LandingPage />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<PasswordResetPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/download" element={<DownloadPage />} />
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<HomePage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/payments/new" element={<PaymentEditPage />} />
            <Route path="/payments/edit/:id" element={<PaymentEditPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/categories/new" element={<CategoryEditPage />} />
            <Route path="/categories/edit/:id" element={<CategoryEditPage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </main>
  );

  const footer = (
    <footer className="border-t border-solid border-gray-300 dark:border-border-dark p-4 sm:p-6 text-sm text-gray-600 dark:text-slate-300">
      <div className="hidden sm:flex items-center justify-between w-full">
        <p className="whitespace-nowrap">
          Создано{" "}
          <a
            href="https://linkedin.com/in/artur-pertsev/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
          >
            apertso
          </a>{" "}
          · 2025
        </p>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6">
            <Link
              to="/terms"
              className="text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Пользовательское соглашение
            </Link>
            <Link
              to="/privacy"
              className="text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Политика конфиденциальности
            </Link>
            <Link
              to="/about"
              className="text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              О нас
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                title="GitHub"
                className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.758-1.333-1.758-1.09-.744.082-.729.082-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.833 2.805 1.303 3.49.997.108-.775.418-1.303.76-1.603-2.665-.303-5.466-1.333-5.466-5.93 0-1.31.47-2.38 1.235-3.22-.124-.303-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.403 2.29-1.552 3.297-1.23 3.297-1.23.655 1.653.243 2.873.12 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.804 5.625-5.476 5.922.43.372.813 1.102.813 2.222 0 1.606-.015 2.902-.015 3.296 0 .32.217.694.825.576C20.565 21.796 24 17.3 24 12c0-6.63-5.37-12-12-12Z" />
                </svg>
              </a>
            )}
            <ThemeSwitcher />
            {isAuthenticated && <FeedbackWidget />}
          </div>
        </div>
      </div>
      <div className="sm:hidden flex flex-col items-center gap-2">
        <p className="text-center">
          Создано{" "}
          <a
            href="https://linkedin.com/in/apertso"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
          >
            apertso
          </a>{" "}
          · 2025
        </p>
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link
            to="/terms"
            className="text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline-offset-2 hover:underline"
          >
            Пользовательское соглашение
          </Link>
          <Link
            to="/privacy"
            className="text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline-offset-2 hover:underline"
          >
            Политика конфиденциальности
          </Link>
          <Link
            to="/about"
            className="text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline-offset-2 hover:underline"
          >
            О нас
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              title="GitHub"
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.758-1.333-1.758-1.09-.744.082-.729.082-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.833 2.805 1.303 3.49.997.108-.775.418-1.303.76-1.603-2.665-.303-5.466-1.333-5.466-5.93 0-1.31.47-2.38 1.235-3.22-.124-.303-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.403 2.29-1.552 3.297-1.23 3.297-1.30.655 1.653.243 2.873.12 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.804 5.625-5.476 5.922.43.372.813 1.102.813 2.222 0 1.606-.015 2.902-.015 3.296 0 .32.217.694.825.576C20.565 21.796 24 17.3 24 12c0-6.63-5.37-12-12-12Z" />
              </svg>
            </a>
          )}
          <ThemeSwitcher />
          {isAuthenticated && <FeedbackWidget />}
        </div>
      </div>
    </footer>
  );

  // Hide header on mobile landing page
  const showHeader = !(isTauriMobile() && location.pathname === "/");

  if (isAuthenticated) {
    // --- Лэйаут для авторизованного пользователя (фиксированный хедер) ---
    const pageBackgroundClasses = getPageBackgroundClasses(location.pathname);
    const containerClassName = `relative flex h-screen flex-col bg-white dark:bg-dark-bg group/design-root overflow-hidden font-sans${
      pageBackgroundClasses ? ` ${pageBackgroundClasses}` : ""
    }${isTauriMobile() ? " safe-area-top" : ""}`;

    return (
      <div className={containerClassName}>
        {showHeader && header}
        <VerificationBanner />
        <div className="flex flex-col flex-1 overflow-auto">
          <div className="flex flex-col flex-1">
            {mainContent}
            {!isTauriMobile() && footer}
          </div>
        </div>
      </div>
    );
  } else {
    // --- Лэйаут для гостя (скролл всей страницы) ---
    const pageBackgroundClasses = getPageBackgroundClasses(location.pathname);
    const containerClassName = `relative flex min-h-screen flex-col bg-white dark:bg-dark-bg group/design-root font-sans${
      pageBackgroundClasses ? ` ${pageBackgroundClasses}` : ""
    }${isTauriMobile() ? " safe-area-top" : ""}`;

    return (
      <div className={containerClassName}>
        {showHeader && header}
        {mainContent}
        {!isTauriMobile() && footer}
      </div>
    );
  }
}

export default App;
