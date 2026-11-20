import { useEffect, useRef, useState, type ReactElement } from "react";
import { Bars3Icon, PlusIcon } from "@heroicons/react/24/outline";
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
  const screenRef = useRef<HTMLDivElement>(null);
  const zoom = usePhonePreviewZoom(screenRef);

  return (
    <div
      role="group"
      aria-label={t("Интерфейс Хочу Плачу на телефоне")}
      className="landing-hero-phone relative mx-auto aspect-[10/21] w-full max-w-[288px] rounded-4xl bg-gray-950 shadow-lg ring-1 ring-gray-950/10 dark:ring-white/10"
    >
      <div
        ref={screenRef}
        className="absolute inset-2 overflow-hidden rounded-3xl bg-[var(--ui-bg)]"
      >
        {/*
          Мобильная разметка приложения: data-phone-preview отключает sm/md брейкпоинты,
          data-app-preview — app-lg/app-xl и даёт токены приложения.
          Пока масштаб не измерен, содержимое скрыто, чтобы не мелькала неуменьшенная панель.
        */}
        <div
          data-app-preview=""
          data-phone-preview=""
          className={`flex h-full flex-col font-sans text-gray-900 dark:text-gray-100 tracking-[-0.003em] ${zoom === null ? "invisible" : ""}`}
          style={{ width: `${PHONE_WIDTH_REM}rem`, zoom: zoom ?? 1, height: zoom ? `${100 / zoom}%` : undefined }}
          inert
        >
          <UiSurfaceContext.Provider value="app">
            {/* Повторяет мобильную шапку приложения из App.tsx */}
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[var(--ui-border)] bg-[var(--ui-bg)] px-1.5">
              <div className="flex min-w-0 items-center gap-1">
                <span className="flex size-9 items-center justify-center text-gray-700 dark:text-gray-200">
                  <Bars3Icon className="size-5" />
                </span>
                <span className="truncate text-base font-semibold text-gray-900 dark:text-gray-50">
                  {t("Главная")}
                </span>
              </div>
              <span className="flex size-9 items-center justify-center text-gray-700 dark:text-gray-200">
                <PlusIcon className="size-5" />
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <HomePage demo={demo} />
            </div>
          </UiSurfaceContext.Provider>
        </div>
      </div>
    </div>
  );
}
