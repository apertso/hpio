// src/context/UiSurfaceContext.tsx
import { createContext, useContext } from "react";

/**
 * Поверхность, на которой рендерятся общие примитивы (кнопки, поля ввода).
 * "app" — рабочий интерфейс приложения в стиле Linear,
 * "public" — индексируемые страницы сайта, сохраняющие прежний вид.
 */
export type UiSurface = "app" | "public";

export const UiSurfaceContext = createContext<UiSurface>("app");

// Возвращает текущую поверхность для выбора набора стилей
export const useUiSurface = (): UiSurface => useContext(UiSurfaceContext);
