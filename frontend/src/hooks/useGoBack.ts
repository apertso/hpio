// src/hooks/useGoBack.ts
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { canGoBackInApp } from "../utils/routeBack";

/**
 * Возвращает функцию «назад» для кнопок интерфейса.
 * Если позади есть запись истории приложения — возвращается на неё,
 * иначе (экран открыт напрямую, по ссылке или после перезагрузки)
 * переходит на `fallback`, чтобы пользователь не застрял на экране.
 */
export const useGoBack = (fallback: string): (() => void) => {
  const navigate = useNavigate();
  return useCallback(() => {
    if (canGoBackInApp()) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  }, [navigate, fallback]);
};
