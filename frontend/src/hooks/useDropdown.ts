import { useState, useRef, useEffect, useCallback } from "react";
import { useBackHandler } from "./useBackHandler";

export const useDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOutsideClick = useCallback((event: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    } else {
      document.removeEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, handleOutsideClick]);

  // «Назад» на Android закрывает открытое меню, а не уходит со страницы
  useBackHandler(isOpen, () => setIsOpen(false));

  return {
    isOpen,
    setIsOpen,
    containerRef,
  };
};
