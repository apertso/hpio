// src/App.tsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PaymentsList from "./pages/PaymentsList";
import CategoriesPage from "./pages/CategoriesPage";
import ArchivePage from "./pages/ArchivePage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LandingPage from "./pages/LandingPage";
import NotFoundPage from "./pages/NotFoundPage";

import { useTheme } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Scrollbar from "./components/Scrollbar";
import { useDropdown } from "./hooks/useDropdown";
import DropdownOverlay from "./components/DropdownOverlay";
import {
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import axiosInstance from "./api/axiosInstance";
import { PHOTO_URL } from "./api/userApi";

// TODO: Создать компонент ThemeSwitcher
const ThemeSwitcher = () => {
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      className="p-2 rounded-md bg-gray-200 dark:bg-card-bg text-gray-800 dark:text-gray-200 cursor-pointer"
    >
      {resolvedTheme === "light" ? "🌙" : "☀️"}{" "}
    </button>
  );
};

// Компонент навигации, который зависит от статуса аутентификации
const Navigation: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const {
    isOpen: isUserPopoverOpen,
    setIsOpen: setIsUserPopoverOpen,
    containerRef: popoverRef,
  } = useDropdown();
  const { setTheme, resolvedTheme } = useTheme();
  const [avatarKey, setAvatarKey] = useState(Date.now());

  useEffect(() => {
    // Обновляем ключ при изменении фото, чтобы `img` перезагрузился
    setAvatarKey(Date.now());
  }, [user?.photoPath]);

  // Скрываем навигацию на страницах аутентификации
  const authPaths = ["/login", "/register", "/forgot-password"];
  if (authPaths.includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="flex items-center gap-8">
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
                    src={`${axiosInstance.defaults.baseURL}${PHOTO_URL}`}
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
              >
                <div
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                >
                  {user?.email && (
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
                        {user.email}
                      </p>
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
                    <button
                      onClick={() => {
                        setTheme(resolvedTheme === "light" ? "dark" : "light");
                      }}
                      className="w-full text-left text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 py-1.5 px-3 rounded-md transition-colors flex items-center text-sm mt-0.5 cursor-pointer"
                      role="menuitem"
                    >
                      {resolvedTheme === "light" ? (
                        <MoonIcon className="mr-3 h-5 w-5 text-gray-500 dark:text-slate-400" />
                      ) : (
                        <SunIcon className="mr-3 h-5 w-5 text-gray-500 dark:text-slate-400" />
                      )}
                      Тема
                    </button>
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
        <ThemeSwitcher />
      )}
    </nav>
  );
};

function App() {
  const scrollableContainerRef = React.useRef<HTMLDivElement>(null);
  return (
    // AuthProvider должен быть внутри BrowserRouter и ThemeProvider
    <AuthProvider>
      <div className="relative flex h-screen flex-col bg-white dark:bg-dark-bg group/design-root overflow-hidden font-sans">
        <header className="flex flex-shrink-0 items-center justify-between whitespace-nowrap border-b border-solid border-gray-300 dark:border-border-dark px-4 sm:px-10 py-3 z-20">
          <div className="flex items-center gap-4 text-black dark:text-white">
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
          </div>
          <Navigation /> {/* Используем компонент навигации */}
        </header>

        <div className="flex-1 relative overflow-hidden">
          <Scrollbar containerRef={scrollableContainerRef} />
          <div
            ref={scrollableContainerRef}
            className="absolute inset-0 overflow-y-auto scrollbar-hide flex flex-col"
          >
            {/* Основное содержимое с роутингом */}
            <main className="px-13 flex flex-1 justify-center py-5">
              <div className="flex flex-col flex-1">
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route
                    path="/forgot-password"
                    element={<PasswordResetPage />}
                  />
                  <Route
                    path="/reset-password"
                    element={<ResetPasswordPage />}
                  />
                  {/* Protected routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<HomePage />} />
                    <Route path="/payments" element={<PaymentsList />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/archive" element={<ArchivePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </div>
            </main>

            <footer className="border-t border-solid border-gray-300 dark:border-border-dark p-6 text-center">
              <div className="container mx-auto text-sm text-gray-600 dark:text-text-secondary">
                <p>
                  © {new Date().getFullYear()} Хочу Плачу. Все права защищены.
                </p>
                <div className="mt-2 space-x-4">
                  <Link to="/about" className="hover:underline">
                    О нас
                  </Link>{" "}
                  {/* TODO: Create /about page or remove */}
                  <Link to="/privacy" className="hover:underline">
                    Политика конфиденциальности
                  </Link>{" "}
                  {/* TODO: Create /privacy page or remove */}
                  <Link to="/terms" className="hover:underline">
                    Условия использования
                  </Link>{" "}
                  {/* TODO: Create /terms page or remove */}
                </div>
                {/* Optional: Add social media icons or other relevant links */}
              </div>
            </footer>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
