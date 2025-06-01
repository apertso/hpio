// src/App.tsx
import React, { useState, useEffect, useRef } from "react"; // Добавляем useState, useEffect, useRef
import { Routes, Route, Link, useLocation } from "react-router-dom"; // Добавляем useLocation
import HomePage from "./pages/HomePage"; // Импорт HomePage
import PaymentsList from "./pages/PaymentsList";
import CategoriesPage from "./pages/CategoriesPage";
import ArchivePage from "./pages/ArchivePage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import NotFoundPage from "./pages/NotFoundPage";

import { useTheme } from "./context/ThemeContext"; // Убедитесь, что импортировано и добавляем useTheme
import { AuthProvider, useAuth } from "./context/AuthContext"; // Импорт AuthProvider и useAuth
import ProtectedRoute from "./components/ProtectedRoute"; // Импорт ProtectedRoute
import {
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline"; // Добавляем UserCircleIcon, ArrowLeftOnRectangleIcon

// TODO: Создать компонент ThemeSwitcher
const ThemeSwitcher = () => {
  const { setTheme, resolvedTheme } = useTheme(); // Используем хук темы
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
    >
      {resolvedTheme === "light" ? "🌙" : "☀️"}{" "}
      {/* Простые иконки для примера */}
    </button>
  );
};

// Компонент навигации, который зависит от статуса аутентификации
const Navigation: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth(); // user should contain email
  const location = useLocation(); // Хук для определения текущего пути
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null); // For detecting outside clicks

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsUserPopoverOpen(false);
      }
    };

    if (isUserPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserPopoverOpen]);

  // Скрываем навигацию на страницах аутентификации
  const authPaths = ["/login", "/register", "/forgot-password"];
  if (authPaths.includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-4">
      {isAuthenticated ? (
        <>
          <Link
            to="/"
            className="hover:underline dark:text-gray-200 text-gray-800"
          >
            Главная
          </Link>
          <Link
            to="/payments"
            className="hover:underline dark:text-gray-200 text-gray-800"
          >
            Список платежей
          </Link>
          <Link
            to="/archive"
            className="hover:underline dark:text-gray-200 text-gray-800"
          >
            Архив
          </Link>
          <Link
            to="/categories"
            className="hover:underline dark:text-gray-200 text-gray-800"
          >
            Категории
          </Link>{" "}
          {/* Добавил Категории */}
          {/* Right side of the header for authenticated users */}
          <div className="flex items-center space-x-3 md:space-x-4">
            {/* <NotificationsBell /> Your existing notifications component */}

            {/* NEW User Icon and Popover */}
            <div className="relative">
              <button
                onClick={() => setIsUserPopoverOpen(!isUserPopoverOpen)}
                className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                aria-label="Открыть меню пользователя"
                aria-expanded={isUserPopoverOpen}
              >
                <UserCircleIcon className="h-7 w-7 text-gray-600 dark:text-gray-300" />
              </button>

              {isUserPopoverOpen && (
                <div
                  ref={popoverRef} // Add ref to the popover div
                  className="absolute right-0 mt-2 w-60 origin-top-right bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5 dark:ring-gray-700 focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabIndex={-1} // Optional: for better accessibility with keyboard navigation
                >
                  {user?.email && (
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Вы вошли как:
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.email}
                      </p>
                    </div>
                  )}
                  <div className="py-1" role="none">
                    <div className="px-2 py-2">
                      {" "}
                      {/* Wrapper for ThemeSwitcher for padding */}
                      <p className="block px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                        Тема
                      </p>
                      <ThemeSwitcher />{" "}
                      {/* Use the existing ThemeSwitcher component here */}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700"></div>
                  <button
                    onClick={() => {
                      logout(); // AuthContext logout
                      setIsUserPopoverOpen(false); // Close popover
                      // Optional: redirect after logout if not handled by AuthContext
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-red-500"
                    role="menuitem"
                    tabIndex={-1}
                    id="user-menu-item-2"
                  >
                    <ArrowLeftOnRectangleIcon className="inline h-5 w-5 mr-2 align-text-bottom" />{" "}
                    {/* Иконка выхода */}
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Навигация для неаутентифицированных, если нужна */}
          {/* <Link to="/login" className="hover:underline">Вход</Link> */}
          {/* <Link to="/register" className="hover:underline">Регистрация</Link> */}
          <ThemeSwitcher /> {/* ThemeSwitcher доступен и на страницах входа */}
        </>
      )}
    </nav>
  );
};

function App() {
  return (
    // AuthProvider должен быть внутри BrowserRouter и ThemeProvider
    <AuthProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col">
        {/* Шапка */}
        <header className="bg-white dark:bg-gray-900 shadow-md p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Мои Платежи
          </h1>
          <Navigation /> {/* Используем компонент навигации */}
        </header>

        {/* Основное содержимое с роутингом */}
        <main className="container mx-auto p-4 flex-grow">
          <Routes>
            {/* Маршруты без защиты (доступны всем) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<PasswordResetPage />} />
            {/* Группа защищенных маршрутов */}
            <Route element={<ProtectedRoute />}>
              {/* Главная страница - горизонтальная лента */}
              <Route path="/" element={<HomePage />} />{" "}
              {/* Используем HomePage */}
              {/* Полный список платежей */}
              <Route path="/payments" element={<PaymentsList />} />
              {/* Дашборд */}
              {/* Категории */}
              <Route path="/categories" element={<CategoriesPage />} />
              {/* Архив */}
              <Route path="/archive" element={<ArchivePage />} />
              {/* Настройки пользователя */}
              <Route path="/settings" element={<SettingsPage />} />
              {/* TODO: Добавить роуты для добавления/редактирования платежа */}
              {/* <Route path="/payments/new" element={<PaymentForm />} /> */}
              {/* <Route path="/payments/:id/edit" element={<PaymentForm />} /> */}
            </Route>{" "}
            {/* Конец ProtectedRoute */}
            {/* 404 Страница - может быть внутри или вне ProtectedRoute в зависимости от логики */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        {/* TODO: Добавить футер */}
        <footer className="bg-white dark:bg-gray-900 border-t dark:border-gray-700 mt-auto p-6 text-center">
          <div className="container mx-auto text-sm text-gray-600 dark:text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} Мои Платежи. Все права защищены.
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
    </AuthProvider>
  );
}

export default App;
