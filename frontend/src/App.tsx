// src/App.tsx
import React, { useState, useEffect, Suspense } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
// Replace static page imports with lazy imports
const HomePage = React.lazy(() => import("./pages/HomePage"));
const PaymentsList = React.lazy(() => import("./pages/PaymentsList"));
const CategoriesPage = React.lazy(() => import("./pages/CategoriesPage"));
const ArchivePage = React.lazy(() => import("./pages/ArchivePage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const RegisterPage = React.lazy(() => import("./pages/RegisterPage"));
const PasswordResetPage = React.lazy(() => import("./pages/PasswordResetPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const NotFoundPage = React.lazy(() => import("./pages/NotFoundPage"));
const PaymentEditPage = React.lazy(() => import("./pages/PaymentEditPage"));
const CategoryEditPage = React.lazy(() => import("./pages/CategoryEditPage"));
const VerifyEmailPage = React.lazy(() => import("./pages/VerifyEmailPage"));

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
import VerificationBanner from "./components/VerificationBanner";
import { useReset } from "./context/ResetContext";
import Spinner from "./components/Spinner";

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

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetUrl = isAuthenticated ? "/dashboard" : "/";

    if (isAuthenticated && location.pathname === targetUrl) {
      triggerReset();
    } else {
      navigate(targetUrl);
    }
  };

  const header = (
    <header className="flex flex-shrink-0 items-center justify-between whitespace-nowrap border-b border-solid border-gray-300 dark:border-border-dark px-4 sm:px-10 py-3 z-20">
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
        <h1 className="text-lg font-bold leading-tight tracking-[-0.015em]">
          Хочу Плачу
        </h1>
      </a>
      <Navigation /> {/* Используем компонент навигации */}
    </header>
  );

  const mainContent = (
    <main className="px-4 sm:px-10 flex flex-1 justify-center py-5">
      <div className="flex flex-col flex-1 w-full">
        <Suspense
          fallback={
            <div className="flex justify-center items-center h-full">
              <Spinner size="lg" />
            </div>
          }
        >
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<PasswordResetPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<HomePage />} />
              <Route path="/payments" element={<PaymentsList />} />
              <Route path="/payments/new" element={<PaymentEditPage />} />
              <Route path="/payments/edit/:id" element={<PaymentEditPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/categories/new" element={<CategoryEditPage />} />
              <Route
                path="/categories/edit/:id"
                element={<CategoryEditPage />}
              />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </main>
  );

  const footer = (
    <footer className="border-t border-solid border-gray-300 dark:border-border-dark p-6 text-center text-sm text-gray-500 dark:text-text-secondary flex justify-center items-center relative">
      <p>© {new Date().getFullYear()} Хочу Плачу.</p>
      <div className="absolute right-4 sm:right-10">
        <ThemeSwitcher />
      </div>
    </footer>
  );

  if (isAuthenticated) {
    // --- Лэйаут для авторизованного пользователя (фиксированный хедер) ---
    return (
      <div className="relative flex h-screen flex-col bg-white dark:bg-dark-bg group/design-root overflow-hidden font-sans">
        {header}
        <VerificationBanner />
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto flex flex-col">
            {mainContent}
            {footer}
          </div>
        </div>
      </div>
    );
  } else {
    // --- Лэйаут для гостя (скролл всей страницы) ---
    return (
      <div className="relative flex min-h-screen flex-col bg-white dark:bg-dark-bg group/design-root font-sans">
        {header}
        {mainContent}
        {footer}
      </div>
    );
  }
}

export default App;
