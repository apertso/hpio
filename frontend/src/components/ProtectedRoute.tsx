// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";

// Компонент для защиты маршрутов
// Требует, чтобы пользователь был аутентифицирован для доступа к вложенным маршрутам (Outlet)
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  // Пока загружается состояние аутентификации, ничего не рендерим или показываем спиннер
  if (loading) {
    return (
      <div className="flex flex-1 justify-center items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Если пользователь не аутентифицирован, перенаправляем его на страницу входа
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Если пользователь аутентифицирован, рендерим вложенные маршруты
  return (
    <div className="w-full flex-1 p-3 sm:px-6 sm:py-6 md:px-8 lg:px-12">
      <Outlet />
    </div>
  );
};

export default ProtectedRoute;
