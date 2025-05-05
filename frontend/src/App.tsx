// src/App.tsx
import React from "react";
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
      className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
    >
      {resolvedTheme === "light" ? "🌙" : "☀️"}{" "}
      {/* Простые иконки для примера */}
    </button>
  );
};

// Компонент навигации, который зависит от статуса аутентификации
const Navigation: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation(); // Хук для определения текущего пути

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
          {/* <Link
            to="/settings"
            className="hover:underline dark:text-gray-200 text-gray-800"
          >
            Настройки
          </Link>{" "} */}
          {/* Добавил Настройки */}
          {/* TODO: Добавить колокольчик уведомлений */}
          <ThemeSwitcher /> {/* Перемещаем ThemeSwitcher сюда */}
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-700 text-white text-sm py-1 px-3 rounded transition-colors duration-200"
          >
            Выйти
          </button>
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
      <div className="min-h-screen bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        {/* Шапка */}
        <header className="bg-white dark:bg-gray-900 shadow-md p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Мои Платежи
          </h1>
          <Navigation /> {/* Используем компонент навигации */}
        </header>

        {/* Основное содержимое с роутингом */}
        <main className="container mx-auto p-4">
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
      </div>
    </AuthProvider>
  );
}

export default App;
