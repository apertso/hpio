import React, { useCallback, useEffect, useRef } from 'react';

interface OverlayScrollbarProps {
  /** Прокручиваемый контейнер, к которому привязывается полоса прокрутки */
  target: HTMLElement | null;
}

/** Минимальная высота ползунка, чтобы его было удобно захватить */
const MIN_THUMB_SIZE = 32;
/** Отступ дорожки от верхнего и нижнего края контейнера */
const TRACK_INSET = 4;
/** Через сколько миллисекунд бездействия ползунок скрывается */
const HIDE_DELAY_MS = 900;

/**
 * Тонкая полоса прокрутки поверх контента (overlay).
 *
 * Не занимает место в раскладке: нативная полоса у контейнера скрыта
 * классом `overlay-scroll`, а этот компонент рисует ползунок абсолютно
 * поверх правого края. Родитель контейнера должен иметь `position: relative`.
 * Ползунок появляется при прокрутке или наведении и плавно исчезает.
 * Положение обновляется напрямую через стили, без ререндеров React.
 */
const OverlayScrollbar: React.FC<OverlayScrollbarProps> = ({ target }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const hoveredRef = useRef(false);
  const dragRef = useRef<{ startY: number; startScrollTop: number } | null>(
    null,
  );

  /** Пересчитывает размер и положение ползунка по текущему состоянию контейнера */
  const update = useCallback((): void => {
    frameRef.current = null;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!target || !track || !thumb) return;

    const { scrollHeight, clientHeight, scrollTop } = target;
    const scrollable = scrollHeight - clientHeight > 1;
    track.dataset.scrollable = scrollable ? 'true' : 'false';
    if (!scrollable) return;

    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max(
      MIN_THUMB_SIZE,
      (clientHeight / scrollHeight) * trackHeight,
    );
    const maxOffset = trackHeight - thumbHeight;
    const progress = scrollTop / (scrollHeight - clientHeight);
    const offset = Math.min(maxOffset, Math.max(0, progress * maxOffset));

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${offset}px)`;
  }, [target]);

  const scheduleUpdate = useCallback((): void => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(update);
  }, [update]);

  /** Показывает ползунок и откладывает его скрытие */
  const reveal = useCallback((): void => {
    const track = trackRef.current;
    if (!track) return;
    track.dataset.visible = 'true';
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      if (hoveredRef.current || dragRef.current) return;
      track.dataset.visible = 'false';
    }, HIDE_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!target) return;

    const handleScroll = (): void => {
      scheduleUpdate();
      reveal();
    };

    // Следим за размером контейнера и его прямых потомков (смена страниц,
    // подгрузка данных), чтобы высота ползунка всегда была актуальной
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    const observeChildren = (): void => {
      resizeObserver.disconnect();
      resizeObserver.observe(target);
      Array.from(target.children).forEach((child) =>
        resizeObserver.observe(child),
      );
      scheduleUpdate();
    };
    const mutationObserver = new MutationObserver(observeChildren);

    observeChildren();
    mutationObserver.observe(target, { childList: true });
    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [target, scheduleUpdate, reveal]);

  /** Соотношение «пиксель дорожки → пиксель прокрутки» для перетаскивания */
  const getScrollRatio = (): number => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!target || !track || !thumb) return 0;
    const free = track.clientHeight - thumb.offsetHeight;
    if (free <= 0) return 0;
    return (target.scrollHeight - target.clientHeight) / free;
  };

  const handleThumbPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ): void => {
    if (!target || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startY: event.clientY, startScrollTop: target.scrollTop };
    trackRef.current?.setAttribute('data-dragging', 'true');
    reveal();
  };

  const handleThumbPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ): void => {
    const drag = dragRef.current;
    if (!target || !drag) return;
    const delta = (event.clientY - drag.startY) * getScrollRatio();
    // instant — чтобы scroll-smooth контейнера не добавлял задержку при перетаскивании
    target.scrollTo({
      top: drag.startScrollTop + delta,
      behavior: 'instant' as ScrollBehavior,
    });
  };

  const handleThumbPointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
  ): void => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    trackRef.current?.setAttribute('data-dragging', 'false');
    reveal();
  };

  /** Клик по дорожке — прокрутка на страницу в сторону клика */
  const handleTrackPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ): void => {
    const thumb = thumbRef.current;
    if (!target || !thumb || event.button !== 0) return;
    const thumbRect = thumb.getBoundingClientRect();
    const direction = event.clientY < thumbRect.top ? -1 : 1;
    target.scrollBy({ top: direction * target.clientHeight * 0.9 });
  };

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      data-visible="false"
      data-scrollable="false"
      data-dragging="false"
      className="overlay-scrollbar"
      style={{ top: TRACK_INSET, bottom: TRACK_INSET }}
      onPointerDown={handleTrackPointerDown}
      onPointerEnter={() => {
        hoveredRef.current = true;
        reveal();
      }}
      onPointerLeave={() => {
        hoveredRef.current = false;
        reveal();
      }}
    >
      <div
        ref={thumbRef}
        className="overlay-scrollbar__thumb"
        onPointerDown={handleThumbPointerDown}
        onPointerMove={handleThumbPointerMove}
        onPointerUp={handleThumbPointerUp}
        onPointerCancel={handleThumbPointerUp}
      />
    </div>
  );
};

export default OverlayScrollbar;
