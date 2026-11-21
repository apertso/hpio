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
  /** Выравнивание по горизонтали относительно триггера при показе снизу/сверху */
  align?: "center" | "start" | "end";
}

const Overlay: React.FC<OverlayProps> = ({
  isOpen,
  children,
  widthClass = "w-56",
  anchorRef,
  offset = 8,
  className = "",
  align = "center",
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
      const leftSpace = a.left - offset;
      const rightSpace = window.innerWidth - (a.right + offset);
      const fitsBelow = bottomSpace >= o.height;
      const fitsAbove = topSpace >= o.height;
      const fitsLeft = leftSpace >= o.width;
      const fitsRight = rightSpace >= o.width;

      let top = 0;
      let left = 0;
      let transformOrigin: string;

      const anchorCenter = a.left + a.width / 2;
      const alignedLeft =
        align === "start"
          ? a.left
          : align === "end"
          ? a.right - o.width
          : anchorCenter - o.width / 2;
      const anchorVerticalCenter = a.top + a.height / 2;

      if (fitsBelow) {
        top = a.bottom + offset;
        left = alignedLeft;
        transformOrigin = "top center";
      } else if (fitsAbove) {
        top = a.top - o.height - offset;
        left = alignedLeft;
        transformOrigin = "bottom center";
      } else if (fitsLeft) {
        top = anchorVerticalCenter - o.height / 2;
        left = a.left - o.width - offset;
        transformOrigin = "center right";
      } else if (fitsRight) {
        top = anchorVerticalCenter - o.height / 2;
        left = a.right + offset;
        transformOrigin = "center left";
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
        top = Math.max(
          padding,
          Math.min(top, window.innerHeight - o.height - padding)
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
  }, [isOpen, anchorRef, offset, children, align]);

  if (!isOpen) return null;

  const baseClasses = `rounded-lg bg-[var(--ui-surface)] dark:bg-gray-800 shadow-lg focus:outline-none border border-[var(--ui-border)] overflow-hidden ${widthClass} ${className}`;

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
