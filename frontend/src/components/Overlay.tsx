import React, { useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

interface OverlayProps {
  isOpen: boolean;
  children: React.ReactNode;
  widthClass?: string;
  // Ссылка на элемент-триггер (containerRef из useDropdown)
  anchorRef?: React.RefObject<HTMLElement | null>;
  offset?: number;
  className?: string;
}

const Overlay: React.FC<OverlayProps> = ({
  isOpen,
  children,
  widthClass = "w-56",
  anchorRef,
  offset = 8,
  className = "",
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    visibility: "hidden",
  });

  // Вычисляем позицию при открытии, ресайзе и скролле
  useLayoutEffect(() => {
    if (!isOpen) return;

    const overlay = overlayRef.current;
    const anchor = anchorRef?.current ?? null;

    const compute = () => {
      if (!overlay || !anchor) {
        // Если anchor не передан, просто показываем над верхом страницы
        setStyle((s) => ({ ...s, visibility: "visible" }));
        return;
      }

      const a = anchor.getBoundingClientRect();
      const o = overlay.getBoundingClientRect();

      const padding = 8;
      const bottomSpace = window.innerHeight - (a.bottom + offset);
      const topSpace = a.top - offset;
      const fitsBelow = bottomSpace >= o.height;
      const fitsAbove = topSpace >= o.height;

      let top = 0;
      let left = 0;
      let transformOrigin: string;

      const anchorCenter = a.left + a.width / 2;

      if (fitsBelow) {
        top = a.bottom + offset;
        left = anchorCenter - o.width / 2;
        transformOrigin = "top center";
      } else if (fitsAbove) {
        top = a.top - o.height - offset;
        left = anchorCenter - o.width / 2;
        transformOrigin = "bottom center";
      } else {
        top = Math.max(padding, (window.innerHeight - o.height) / 2);
        left = Math.max(padding, (window.innerWidth - o.width) / 2);
        transformOrigin = "center";
      }

      if (transformOrigin !== "center") {
        left = Math.max(
          padding,
          Math.min(left, window.innerWidth - o.width - padding)
        );
      }

      setStyle({
        position: "fixed",
        top: Math.round(top) + "px",
        left: Math.round(left) + "px",
        transformOrigin,
        visibility: "visible",
        zIndex: 9999,
      });
    };

    // compute после первого рендера оверлея (overlayRef уже в DOM)
    compute();

    window.addEventListener("resize", compute);
    // слушаем скролл в capture, чтобы поймать прокрутку контейнеров
    window.addEventListener("scroll", compute, true);

    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [isOpen, anchorRef, offset, children]);

  if (!isOpen) return null;

  const baseClasses = `rounded-xl bg-white dark:bg-slate-900 shadow-[0_28px_45px_rgba(15,23,42,0.15)] dark:shadow-[0_35px_60px_rgba(0,0,0,0.55)] focus:outline-none border border-gray-300 dark:border-slate-700 overflow-hidden ${widthClass} ${className}`;

  // Рендерим в портал, чтобы ОВЕРЛЕЙ был вне document flow таблицы
  return ReactDOM.createPortal(
    <div
      ref={overlayRef}
      role="menu"
      aria-orientation="vertical"
      className={baseClasses}
      style={style}
      // Предотвращаем "клик снаружи" (useDropdown слушает mousedown на document)
      onMouseDown={(e) => {
        e.stopPropagation(); // предотвращаем всплытие до document mousedown
      }}
    >
      {children}
    </div>,
    // Портал в document.body
    document.body
  );
};

export default Overlay;
