import { useEffect, useRef, useState, type ReactElement } from "react";
import { useLanguage } from "../context/LanguageContext";
import { UiSurfaceContext } from "../context/UiSurfaceContext";
import HomePage from "../pages/HomePage";
import { useLandingDashboardDemo } from "../hooks/useLandingDashboardDemo";
import AppSidebar from "./AppSidebar";
import { LandingMobileMockup } from "./LandingMobileMockup";

/*
 * Ширина планшета в rem приложения: 768px при корневом размере шрифта 13px.
 * На лендинге корневой размер другой, поэтому ширина задаётся в rem —
 * так пропорции текста, отступов и ширины совпадают с приложением.
 */
const TABLET_WIDTH_REM = 768 / 13;

/** Брейкпоинт md: начиная с него показываем планшетную панель, ниже — мобильный шаблон. */
const TABLET_MEDIA_QUERY = "(width >= 48rem)";

/** Отслеживает, достаточно ли широк экран для планшетной панели. */
function useIsTabletViewport(): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(TABLET_MEDIA_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(TABLET_MEDIA_QUERY);
    const update = (): void => setMatches(query.matches);
    query.addEventListener("change", update);
    update();
    return () => query.removeEventListener("change", update);
  }, []);

  return matches;
}

/**
 * Подбирает масштаб, чтобы планшетная разметка целиком помещалась в доступную область:
 * по ширине — в колонку (areaRef), по высоте — в max-height рамки (frameRef).
 * Так панель видна полностью без прокрутки внутри. До первого замера масштаб не применяется (null).
 */
function useTabletPreviewZoom(
  areaRef: React.RefObject<HTMLElement | null>,
  frameRef: React.RefObject<HTMLDivElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>
): number | null {
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    const area = areaRef.current;
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!area || !frame || !content) return;
    const tabletQuery = window.matchMedia(TABLET_MEDIA_QUERY);
    const update = (): void => {
      if (!tabletQuery.matches) {
        setZoom(null);
        return;
      }
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
      // Рамка вокруг панели тоже занимает ширину колонки — вычитаем её бордер
      const border = frame.parentElement ? frame.parentElement.offsetWidth - frame.parentElement.clientWidth : 0;
      const widthZoom = Math.min(1, (area.clientWidth - border) / (TABLET_WIDTH_REM * rootFontSize));

      // Естественная высота: видимая высота, делённая на масштаб, который реально применён в DOM
      const currentZoom = parseFloat(getComputedStyle(content).zoom) || 1;
      const naturalHeight = content.getBoundingClientRect().height / currentZoom;
      const maxHeight = parseFloat(getComputedStyle(frame).maxHeight);
      const heightZoom = Number.isFinite(maxHeight) && naturalHeight > 0 ? maxHeight / naturalHeight : Infinity;

      /*
        При другом масштабе текст округляется иначе, и высота панели чуть меняется.
        Без защиты это зацикливается: масштаб → высота → масштаб, и ширина панели дрожит.
        Поэтому масштаб квантуем шагом 1% (вниз, чтобы панель точно помещалась), уменьшение применяем сразу,
        а увеличиваем, только когда запас больше полутора шагов — дрожание округления до этого порога не дотягивает.
      */
      const raw = Math.min(widthZoom, heightZoom);
      const next = Math.floor(raw * 100) / 100;
      setZoom((prev) => (prev !== null && raw >= prev && raw - prev < 0.015 ? prev : next));
    };
    const observer = new ResizeObserver(update);
    observer.observe(area);
    // Демо-данные могут поменять высоту панели после первого рендера
    observer.observe(content);
    tabletQuery.addEventListener("change", update);
    // Ширина колонки при изменении только высоты окна не меняется — слушаем окно отдельно
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      tabletQuery.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, [areaRef, frameRef, contentRef]);

  return zoom;
}

/**
 * Превью панели управления на лендинге.
 * На телефоне показывает тот же мобильный шаблон, что и на странице загрузки.
 */
export function LandingDashboardPreview(): ReactElement {
  const isTablet = useIsTabletViewport();
  return isTablet ? <TabletDashboardPreview /> : <LandingMobileMockup />;
}

/** Планшетная разметка приложения с сайдбаром и главной страницей на демонстрационных данных. */
function TabletDashboardPreview(): ReactElement {
  const { t } = useLanguage();
  const areaRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const zoom = useTabletPreviewZoom(areaRef, frameRef, contentRef);
  const demo = useLandingDashboardDemo();

  return (
    <figure ref={areaRef} aria-label={t("Панель управления с демонстрационными данными")}>
      {/*
        Рамка сжимается по содержимому: если панель уменьшена под высоту окна, справа не остаётся пустой полосы.
        max-height — высота окна за вычетом шапки и отступов героя (в rem, как и сами отступы).
      */}
      <div className="relative mx-auto w-fit overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] shadow-xl min-[60rem]:mr-0">
        <div
          ref={frameRef}
          className="max-h-[calc(100dvh-13rem)] overflow-hidden"
          aria-label={t("Предпросмотр панели управления")}
        >
          {/* Планшетная разметка: data-app-preview отключает app-lg/app-xl брейкпоинты и даёт токены приложения */}
          <div
            ref={contentRef}
            data-app-preview=""
            className="flex font-sans text-gray-900 dark:text-gray-100 w-[59.077rem] [zoom:0.84] tracking-[-0.003em]"
            style={zoom === null ? undefined : { zoom }}
            inert
          >
            <UiSurfaceContext.Provider value="app">
              <AppSidebar demo />
              <div className="flex min-w-0 flex-1 flex-col py-2 pr-2">
                <div className="overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-sm">
                  <HomePage demo={demo} />
                </div>
              </div>
            </UiSurfaceContext.Provider>
          </div>
        </div>
      </div>
    </figure>
  );
}
