// src/hooks/useBackHandler.ts
import { useEffect, useRef } from "react";
import { registerBackHandler } from "../utils/backHandlers";

/**
 * Перехватывает системную кнопку «Назад» на Android, пока `active === true`.
 *
 * Используется слоями поверх страницы (модалки, панели, меню, поиск):
 * «Назад» должен закрывать верхний слой, а не уходить со страницы
 * и тем более не сворачивать приложение.
 *
 * `onBack` может вернуть `false`, чтобы пропустить нажатие к следующему слою
 * (например, если слой сейчас скрыт). Любое другое значение считается обработкой.
 */
export const useBackHandler = (
  active: boolean,
  onBack: () => boolean | void,
): void => {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active) return;
    return registerBackHandler(() => onBackRef.current() !== false);
  }, [active]);
};
