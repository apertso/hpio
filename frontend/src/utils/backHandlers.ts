// src/utils/backHandlers.ts

/**
 * Стек обработчиков системной кнопки «Назад» (и жеста «назад») на Android.
 *
 * Открытые слои интерфейса — модалки, нижние панели, боковое меню, выпадающие
 * списки, раскрытый поиск — регистрируют обработчик, пока они видны.
 * При нажатии «Назад» срабатывает самый верхний (последний открытый) слой.
 * Обработчик возвращает `true`, если он обработал нажатие, и `false`, если
 * слой сейчас не виден (например, десктопная модалка скрыта на мобильном экране)
 * и нажатие нужно передать следующему слою.
 */
export type BackHandler = () => boolean;

interface BackHandlerEntry {
  id: number;
  handler: BackHandler;
}

const handlerStack: BackHandlerEntry[] = [];
let nextHandlerId = 1;

/** Регистрирует обработчик поверх стека. Возвращает функцию снятия регистрации. */
export const registerBackHandler = (handler: BackHandler): (() => void) => {
  const id = nextHandlerId++;
  handlerStack.push({ id, handler });
  return () => {
    const index = handlerStack.findIndex((entry) => entry.id === id);
    if (index !== -1) handlerStack.splice(index, 1);
  };
};

/**
 * Передаёт нажатие «Назад» слоям, начиная с верхнего.
 * Возвращает `true`, если какой-то слой его обработал.
 */
export const dispatchBackToLayers = (): boolean => {
  // Копия: обработчик может закрыть слой и снять регистрацию прямо во время обхода
  const snapshot = [...handlerStack];
  for (let i = snapshot.length - 1; i >= 0; i -= 1) {
    if (snapshot[i].handler()) return true;
  }
  return false;
};

/**
 * Проверяет, что элемент действительно отображается на экране
 * (не скрыт через `display: none`, в том числе классами `hidden md:flex`).
 */
export const isElementShown = (element: Element | null): boolean =>
  element !== null && element.getClientRects().length > 0;
