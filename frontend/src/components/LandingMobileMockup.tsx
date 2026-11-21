import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { FloatingActionButton, HEADER_ICON_BUTTON_CLASS } from "./layout/AppHeader";
import { useLanguage } from "../context/LanguageContext";
import { UiSurfaceContext } from "../context/UiSurfaceContext";
import { useLandingDashboardDemo } from "../hooks/useLandingDashboardDemo";
import HomePage from "../pages/HomePage";

/*
 * Ширина экрана типичного телефона в rem: 375px при корневом размере шрифта 16px —
 * как у мобильной версии приложения и у публичных страниц.
 */
const PHONE_WIDTH_REM = 375 / 16;

/**
 * Подбирает масштаб, чтобы мобильная разметка шириной в экран телефона
 * целиком помещалась по ширине в экран макета (screenRef).
 */
function usePhonePreviewZoom(screenRef: React.RefObject<HTMLDivElement | null>): number | null {
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;
    const update = (): void => {
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const next = screen.clientWidth / (PHONE_WIDTH_REM * rootFontSize);
      // Квантуем шагом 0,5%, чтобы не перерисовывать панель из-за дробных пикселей
      setZoom(Math.floor(next * 200) / 200);
    };
    const observer = new ResizeObserver(update);
    observer.observe(screen);
    update();
    return () => observer.disconnect();
  }, [screenRef]);

  return zoom;
}

/** Телефон с настоящей главной страницей приложения на демонстрационных данных. */
export function LandingMobileMockup(): ReactElement {
  const { t } = useLanguage();
  const demo = useLandingDashboardDemo();
  const phoneDemo = useMemo(() => ({ ...demo, floatingMenuButton: true }), [demo]);
  const screenRef = useRef<HTMLDivElement>(null);
  const zoom = usePhonePreviewZoom(screenRef);

  // isolate: z-index внутренних слоёв макета (шапка z-30, кнопка «+» z-20) не выходит наружу
  // и не перекрывает выпадающие меню верхней панели страницы
  return (
    <div
      role="group"
      aria-label={t("Интерфейс Хочу Плачу на телефоне")}
      className="landing-hero-phone relative isolate mx-auto aspect-[10/21] w-full max-w-[288px] rounded-4xl bg-gray-950 shadow-lg ring-1 ring-gray-950/10 dark:ring-white/10"
    >
      <div
        ref={screenRef}
        className="absolute inset-2 overflow-hidden rounded-3xl bg-[var(--ui-bg)]"
      >
        {/*
          Мобильная разметка приложения: data-phone-preview отключает sm/md брейкпоинты,
          data-app-preview — app-lg/app-xl и даёт токены приложения.
          Пока масштаб не измерен, содержимое скрыто, чтобы не мелькала неуменьшенная панель.
          Высота h-full: процентная высота под zoom считается от высоты экрана макета,
          поэтому плавающая кнопка «+» остаётся внизу экрана.
        */}
        <div
          data-app-preview=""
          data-phone-preview=""
          className={`flex h-full flex-col font-sans text-gray-900 dark:text-gray-100 tracking-[-0.003em] ${zoom === null ? "invisible" : ""}`}
          style={{ width: `${PHONE_WIDTH_REM}rem`, zoom: zoom ?? 1 }}
          inert
        >
          <UiSurfaceContext.Provider value="app">
            {/*
              Повторяет мобильную оболочку главной из App.tsx: полосы шапки нет,
              кнопка меню плавает слева сверху, а блок «К оплате» обтекает её;
              кнопка добавления платежа — плавающая внизу справа.
            */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-14 items-center gap-1 px-2">
                <span className={`${HEADER_ICON_BUTTON_CLASS} bg-[var(--ui-bg)]/80 backdrop-blur-md [&_svg]:size-5`}>
                  <Bars3Icon />
                </span>
              </header>
              <HomePage demo={phoneDemo} />
              <div className="pointer-events-none absolute bottom-5 right-4 z-20">
                <FloatingActionButton action={{ label: t("Добавить платеж"), onClick: () => {} }} />
              </div>
            </div>
          </UiSurfaceContext.Provider>
        </div>
      </div>
    </div>
  );
}
