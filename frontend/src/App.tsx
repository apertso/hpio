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

// TODO: Создать компонент ThemeSwitcher
const ThemeSwitcher = () => {
  const { setTheme, resolvedTheme } = useTheme(); // Используем хук темы
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      className="p-2 rounded-md bg-gray-200 dark:bg-card-bg text-gray-800 dark:text-gray-200"
    >
      {resolvedTheme === "light" ? "🌙" : "☀️"}{" "}
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
    <nav className="flex items-center gap-8">
      {isAuthenticated ? (
        <>
          <div className="hidden md:flex items-center gap-9">
            <Link
              to="/"
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
            <div className="relative">
              <button
                onClick={() => setIsUserPopoverOpen(!isUserPopoverOpen)}
                className="flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-card-bg focus:outline-none"
                aria-label="Открыть меню пользователя"
                aria-expanded={isUserPopoverOpen}
              >
                <div
                  className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
                  style={{
                    backgroundImage: `url('https://i.pravatar.cc/40?u=${user?.email}')`,
                  }}
                ></div>
              </button>

              {isUserPopoverOpen && (
                <div
                  ref={popoverRef}
                  className="absolute right-0 mt-2 w-60 origin-top-right bg-white dark:bg-card-bg rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5 dark:ring-border-dark focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabIndex={-1}
                >
                  {user?.email && (
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-border-dark">
                      <p className="text-sm text-gray-700 dark:text-text-secondary">
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
                      <p className="block px-2 py-1 text-xs text-gray-500 dark:text-text-secondary">
                        Тема
                      </p>
                      <ThemeSwitcher />{" "}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-border-dark"></div>
                  <button
                    onClick={() => {
                      logout();
                      setIsUserPopoverOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-red-500"
                    role="menuitem"
                    tabIndex={-1}
                    id="user-menu-item-2"
                  >
                    Выйти
                  </button>
                </div>
              )}
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
  return (
    // AuthProvider должен быть внутри BrowserRouter и ThemeProvider
    <AuthProvider>
      <div className="relative flex size-full min-h-screen flex-col bg-white dark:bg-dark-bg group/design-root overflow-x-hidden font-sans">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 dark:border-border-dark px-4 sm:px-10 py-3">
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

        {/* Основное содержимое с роутингом */}
        <main className="px-10 flex flex-1 justify-center py-5">
          <div className="flex flex-col flex-1">
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
          </div>
        </main>

        <footer className="border-t border-solid border-gray-200 dark:border-border-dark mt-auto p-6 text-center">
          <div className="container mx-auto text-sm text-gray-600 dark:text-text-secondary">
            <p>
              &copy; {new Date().getFullYear()} Хочу Плачу. Все права защищены.
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
