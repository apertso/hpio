import React, {
  useState,
  useEffect,
  RefObject,
  useRef,
  useCallback,
} from "react";

interface ScrollbarProps {
  containerRef: RefObject<HTMLElement | null>;
}

const SCROLLBAR_MARGIN = 5; // 5px margin from top and bottom

const Scrollbar: React.FC<ScrollbarProps> = ({ containerRef }) => {
  const [thumbStyle, setThumbStyle] = useState({
    height: "0px",
    top: "0px",
    display: "none",
  });

  const scrollbarTrackRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ startY: 0, startScrollTop: 0 });
  const isDraggingRef = useRef(false);

  const updateThumb = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    if (scrollHeight <= clientHeight) {
      setThumbStyle((prev) => ({ ...prev, display: "none" }));
      return;
    }

    // Adjust track height for margins
    const thumbTrackHeight = clientHeight - 2 * SCROLLBAR_MARGIN;
    const thumbHeight = Math.max(
      (clientHeight / scrollHeight) * thumbTrackHeight,
      20
    );

    const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
    const thumbTop =
      SCROLLBAR_MARGIN + scrollPercentage * (thumbTrackHeight - thumbHeight);

    setThumbStyle({
      height: `${thumbHeight}px`,
      top: `${thumbTop}px`,
      display: "block",
    });
  }, [containerRef]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      e.preventDefault();

      const { scrollHeight, clientHeight } = containerRef.current;
      const deltaY = e.clientY - dragStartRef.current.startY;

      const scrollableContentHeight = scrollHeight - clientHeight;
      const thumbHeight = parseFloat(thumbStyle.height);

      if (isNaN(thumbHeight) || thumbHeight === 0) return;

      const thumbTrackHeight = clientHeight - 2 * SCROLLBAR_MARGIN;
      const thumbScrollRange = thumbTrackHeight - thumbHeight;

      if (thumbScrollRange <= 0) return; // Prevent division by zero

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
    },
    [containerRef, thumbStyle.height]
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
      e.stopPropagation(); // Prevent track click event from firing

      isDraggingRef.current = true;
      dragStartRef.current = {
        startY: e.clientY,
        startScrollTop: containerRef.current.scrollTop,
      };

      document.body.style.userSelect = "none";

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [containerRef, handleMouseMove, handleMouseUp]
  );

  const handleTrackMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || !scrollbarTrackRef.current) return;
      e.preventDefault();

      const { clientHeight } = containerRef.current;
      const trackRect = scrollbarTrackRef.current.getBoundingClientRect();
      const thumbTop = parseFloat(thumbStyle.top);

      // Determine click position relative to the track
      const clickY = e.clientY - trackRect.top;

      // Scroll up or down by one "page" (the height of the container)
      if (clickY < thumbTop) {
        // Clicked above the thumb
        containerRef.current.scrollBy({
          top: -clientHeight,
          behavior: "smooth",
        });
      } else {
        // Clicked below the thumb
        containerRef.current.scrollBy({
          top: clientHeight,
          behavior: "smooth",
        });
      }
    },
    [containerRef, thumbStyle.top]
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

  return (
    <div
      ref={scrollbarTrackRef}
      onMouseDown={handleTrackMouseDown}
      className="absolute top-0 right-0 h-full w-2.5 z-10"
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="absolute rounded bg-gray-400 dark:bg-gray-600 opacity-50 hover:opacity-75 transition-opacity"
        style={{
          ...thumbStyle,
          width: "8px",
          right: "2px",
        }}
        onMouseDown={handleThumbMouseDown}
      />
    </div>
  );
};

export default Scrollbar;
