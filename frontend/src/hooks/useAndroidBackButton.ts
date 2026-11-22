// src/hooks/useAndroidBackButton.ts
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { dispatchBackToLayers } from "../utils/backHandlers";
import { canGoBackInApp, resolveRouteBack } from "../utils/routeBack";
import logger from "../utils/logger";

/** Ответ нативной стороне: нажатие обработано или приложение нужно свернуть. */
export type NativeBackResult = "handled" | "exit";

declare global {
  interface Window {
    /**
     * Вызывается из MainActivity при системной кнопке/жесте «Назад».
     * Возвращает "handled", если WebView обработал нажатие, или "exit",
     * если открыт корневой экран и приложение нужно свернуть.
     */
    __hpioHandleBack?: () => NativeBackResult;
  }
}

/**
 * Подключает системную кнопку «Назад» Android к навигации приложения:
 * сначала закрывается верхний открытый слой (модалка, панель, меню, поиск),
 * затем выполняется переход на родительский экран, и только на корневом
 * экране приложение сворачивается.
 */
export const useAndroidBackButton = (isAuthenticated: boolean): void => {
  const navigate = useNavigate();
  const location = useLocation();
  const stateRef = useRef({ navigate, pathname: location.pathname, isAuthenticated });
  stateRef.current = { navigate, pathname: location.pathname, isAuthenticated };

  useEffect(() => {
    const handleBack = (): NativeBackResult => {
      try {
        if (dispatchBackToLayers()) return "handled";

        const { navigate: go, pathname, isAuthenticated: authed } =
          stateRef.current;
        const action = resolveRouteBack(pathname, authed, canGoBackInApp());
        switch (action.type) {
          case "history":
            go(-1);
            return "handled";
          case "navigate":
            go(action.to, { replace: true });
            return "handled";
          case "exit":
            return "exit";
        }
      } catch (error) {
        logger.error("Back button handling failed", error);
        return "exit";
      }
    };

    window.__hpioHandleBack = handleBack;
    return () => {
      if (window.__hpioHandleBack === handleBack) {
        delete window.__hpioHandleBack;
      }
    };
  }, []);
};
