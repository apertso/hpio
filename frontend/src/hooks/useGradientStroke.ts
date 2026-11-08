import { useCallback, type RefCallback } from "react";

export function useGradientStroke(): RefCallback<HTMLElement> {
  return useCallback((element: HTMLElement | null): (() => void) | void => {
    if (!element || typeof IntersectionObserver === "undefined") return;

    let inView = false;
    const updateAnimation = (): void => {
      element.toggleAttribute("data-stroke-visible", inView && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateAnimation();
    });

    observer.observe(element);
    document.addEventListener("visibilitychange", updateAnimation);

    return (): void => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateAnimation);
      element.removeAttribute("data-stroke-visible");
    };
  }, []);
}
