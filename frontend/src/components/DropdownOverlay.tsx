import React, { useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

interface DropdownOverlayProps {
  isOpen: boolean;
  children: React.ReactNode;
  align?: "left" | "right";
  widthClass?: string;
  // Ссылка на элемент-триггер (containerRef из useDropdown)
  anchorRef?: React.RefObject<HTMLElement | null>;
  offset?: number;
  className?: string;
}

const DropdownOverlay: React.FC<DropdownOverlayProps> = ({
  isOpen,
  children,
  align = "left",
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

      // default: показываем снизу
      let top = a.bottom + offset;
      let left = align === "right" ? a.right - o.width : a.left;
      let transformOrigin = align === "right" ? "top right" : "top left";

      // Если не влезает вниз - показываем сверху
      if (top + o.height > window.innerHeight) {
        top = a.top - o.height - offset;
        transformOrigin = align === "right" ? "bottom right" : "bottom left";
      }

      // Ограничим по горизонтали, чтобы не выйти за окно
      const padding = 8;
      left = Math.max(
        padding,
        Math.min(left, window.innerWidth - o.width - padding)
      );

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
  }, [isOpen, anchorRef, align, offset, children]);

  if (!isOpen) return null;

  const baseClasses = `rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-300 dark:border-gray-700 ${widthClass} ${className}`;

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

export default DropdownOverlay;
