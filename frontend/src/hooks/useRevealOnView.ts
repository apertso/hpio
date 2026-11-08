import { useLayoutEffect, type RefObject } from "react";

export function useRevealOnView(
  ref: RefObject<HTMLElement | SVGElement | null>,
  enabled = true,
): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof IntersectionObserver === "undefined") return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    const threshold = 0.35;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < threshold) return;
      if (motion.matches) {
        delete element.dataset.revealState;
      } else {
        element.dataset.revealState = "playing";
      }
      observer.disconnect();
    }, { threshold });

    element.dataset.revealState = "pending";
    observer.observe(element);
    return (): void => {
      observer.disconnect();
      delete element.dataset.revealState;
    };
  }, [enabled, ref]);
}
