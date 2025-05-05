// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Компонент для защиты маршрутов
// Требует, чтобы пользователь был аутентифицирован для доступа к вложенным маршрутам (Outlet)
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  // Пока загружается состояние аутентификации, ничего не рендерим или показываем спиннер
  if (loading) {
    // TODO: Заменить на реальный спиннер загрузки
    return <div>Проверка аутентификации...</div>;
  }

  // Если пользователь не аутентифицирован, перенаправляем его на страницу входа
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Если пользователь аутентифицирован, рендерим вложенные маршруты
  return <Outlet />;
};

export default ProtectedRoute;
