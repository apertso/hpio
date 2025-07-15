import React, {
  useState,
  useEffect,
  RefObject,
  useRef,
  useCallback,
} from "react";

interface ScrollbarProps {
  containerRef: RefObject<HTMLElement | null>;
  orientation?: "vertical" | "horizontal";
}

const SCROLLBAR_MARGIN = 5; // 5px margin

// Remove animateScroll and easeOutCubic helpers

const Scrollbar: React.FC<ScrollbarProps> = ({
  containerRef,
  orientation = "vertical",
}) => {
  const [thumbStyle, setThumbStyle] = useState({
    height: "0px",
    top: "0px",
    width: "0px",
    left: "0px",
    display: "none",
  });

  const scrollbarTrackRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({
    startY: 0,
    startScrollTop: 0,
    startX: 0,
    startScrollLeft: 0,
  });
  const isDraggingRef = useRef(false);
  const isVertical = orientation === "vertical";
  // Remove animationFrameRef declaration

  const updateThumb = useCallback(() => {
    if (!containerRef.current) return;

    if (isVertical) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollHeight <= clientHeight) {
        setThumbStyle((prev) => ({ ...prev, display: "none" }));
        return;
      }
      const thumbTrackHeight = clientHeight - 2 * SCROLLBAR_MARGIN;
      const thumbHeight = Math.max(
        (clientHeight / scrollHeight) * thumbTrackHeight,
        20
      );
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
      const thumbTop =
        SCROLLBAR_MARGIN + scrollPercentage * (thumbTrackHeight - thumbHeight);
      setThumbStyle((prev) => ({
        ...prev,
        height: `${thumbHeight}px`,
        top: `${thumbTop}px`,
        display: "block",
      }));
    } else {
      // Horizontal
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      if (scrollWidth <= clientWidth) {
        setThumbStyle((prev) => ({ ...prev, display: "none" }));
        return;
      }
      const thumbTrackWidth = clientWidth - 2 * SCROLLBAR_MARGIN;
      const thumbWidth = Math.max(
        (clientWidth / scrollWidth) * thumbTrackWidth,
        20
      );
      const scrollPercentage = scrollLeft / (scrollWidth - clientWidth);
      const thumbLeft =
        SCROLLBAR_MARGIN + scrollPercentage * (thumbTrackWidth - thumbWidth);
      setThumbStyle((prev) => ({
        ...prev,
        width: `${thumbWidth}px`,
        left: `${thumbLeft}px`,
        display: "block",
      }));
    }
  }, [containerRef, isVertical]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      e.preventDefault();

      if (isVertical) {
        const { scrollHeight, clientHeight } = containerRef.current;
        const thumbTrackHeight = clientHeight - 2 * SCROLLBAR_MARGIN;
        const thumbHeight = Math.max(
          (clientHeight / scrollHeight) * thumbTrackHeight,
          20
        );

        const deltaY = e.clientY - dragStartRef.current.startY;
        const scrollableContentHeight = scrollHeight - clientHeight;

        if (isNaN(thumbHeight) || thumbHeight === 0) return;

        const thumbScrollRange = thumbTrackHeight - thumbHeight;
        if (thumbScrollRange <= 0) return;

        const contentScrollPerThumbPixel =
          scrollableContentHeight / thumbScrollRange;
        let newScrollTop =
          dragStartRef.current.startScrollTop +
          deltaY * contentScrollPerThumbPixel;
        newScrollTop = Math.max(
          0,
          Math.min(newScrollTop, scrollableContentHeight)
        );
        containerRef.current.scrollTop = newScrollTop;
      } else {
        // Horizontal
        const { scrollWidth, clientWidth } = containerRef.current;
        const thumbTrackWidth = clientWidth - 2 * SCROLLBAR_MARGIN;
        const thumbWidth = Math.max(
          (clientWidth / scrollWidth) * thumbTrackWidth,
          20
        );

        const deltaX = e.clientX - dragStartRef.current.startX;
        const scrollableContentWidth = scrollWidth - clientWidth;

        if (isNaN(thumbWidth) || thumbWidth === 0) return;

        const thumbScrollRange = thumbTrackWidth - thumbWidth;
        if (thumbScrollRange <= 0) return;

        const contentScrollPerThumbPixel =
          scrollableContentWidth / thumbScrollRange;
        let newScrollLeft =
          dragStartRef.current.startScrollLeft +
          deltaX * contentScrollPerThumbPixel;
        newScrollLeft = Math.max(
          0,
          Math.min(newScrollLeft, scrollableContentWidth)
        );
        containerRef.current.scrollLeft = newScrollLeft;
      }
    },
    [containerRef, isVertical]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      isDraggingRef.current = false;
      document.body.style.userSelect = "auto";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      e.preventDefault();
    },
    [handleMouseMove]
  );

  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      isDraggingRef.current = true;
      if (isVertical) {
        dragStartRef.current = {
          ...dragStartRef.current,
          startY: e.clientY,
          startScrollTop: containerRef.current.scrollTop,
        };
      } else {
        dragStartRef.current = {
          ...dragStartRef.current,
          startX: e.clientX,
          startScrollLeft: containerRef.current.scrollLeft,
        };
      }

      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [containerRef, handleMouseMove, handleMouseUp, isVertical]
  );

  const handleTrackMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || !scrollbarTrackRef.current) return;
      e.preventDefault();

      if (isVertical) {
        const { clientHeight, scrollHeight, scrollTop } = containerRef.current;
        const trackRect = scrollbarTrackRef.current.getBoundingClientRect();

        const thumbTrackHeight = clientHeight - 2 * SCROLLBAR_MARGIN;
        const thumbHeight = Math.max(
          (clientHeight / scrollHeight) * thumbTrackHeight,
          20
        );
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
        const thumbTop =
          SCROLLBAR_MARGIN +
          scrollPercentage * (thumbTrackHeight - thumbHeight);

        const clickY = e.clientY - trackRect.top;
        if (clickY < thumbTop) {
          containerRef.current.scrollBy({
            top: -clientHeight,
            behavior: "smooth",
          });
        } else {
          containerRef.current.scrollBy({
            top: clientHeight,
            behavior: "smooth",
          });
        }
      } else {
        const { clientWidth, scrollWidth, scrollLeft } = containerRef.current;
        const trackRect = scrollbarTrackRef.current.getBoundingClientRect();

        const thumbTrackWidth = clientWidth - 2 * SCROLLBAR_MARGIN;
        const thumbWidth = Math.max(
          (clientWidth / scrollWidth) * thumbTrackWidth,
          20
        );
        const scrollPercentage = scrollLeft / (scrollWidth - clientWidth);
        const thumbLeft =
          SCROLLBAR_MARGIN + scrollPercentage * (thumbTrackWidth - thumbWidth);

        const clickX = e.clientX - trackRect.left;
        if (clickX < thumbLeft) {
          containerRef.current.scrollBy({
            left: -clientWidth,
            behavior: "smooth",
          });
        } else {
          containerRef.current.scrollBy({
            left: clientWidth,
            behavior: "smooth",
          });
        }
      }
    },
    [containerRef, isVertical]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleUpdate = () => {
      requestAnimationFrame(updateThumb);
    };

    const observer = new MutationObserver(handleUpdate);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    container.addEventListener("scroll", handleUpdate);
    window.addEventListener("resize", handleUpdate);
    handleUpdate();

    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [containerRef, updateThumb, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const scrollbar = scrollbarTrackRef.current;
    const container = containerRef.current;
    if (!scrollbar || !container) return;

    const wheelHandler = (e: WheelEvent) => {
      if (isVertical) {
        container.scrollBy({ top: e.deltaY, behavior: "smooth" });
      } else {
        container.scrollBy({ left: e.deltaX, behavior: "smooth" });
      }
    };

    scrollbar.addEventListener("wheel", wheelHandler, { passive: true });

    return () => {
      scrollbar.removeEventListener("wheel", wheelHandler);
    };
  }, [containerRef, isVertical]);

  return (
    <div
      ref={scrollbarTrackRef}
      onMouseDown={handleTrackMouseDown}
      className={`absolute z-10 ${
        isVertical
          ? "top-0 right-0 h-full w-2.5"
          : "bottom-0 left-0 w-full h-2.5"
      }`}
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="absolute rounded bg-gray-400 dark:bg-gray-600 opacity-50 hover:opacity-75 transition-opacity cursor-pointer"
        style={
          isVertical
            ? {
                ...thumbStyle,
                width: "8px",
                right: "2px",
              }
            : {
                ...thumbStyle,
                height: "8px",
                bottom: "2px",
              }
        }
        onMouseDown={handleThumbMouseDown}
      />
    </div>
  );
};

export default Scrollbar;
