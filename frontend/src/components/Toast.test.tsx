import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Toast from "./Toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it.each(["hover", "click"])("resumes the remaining toast time after %s pauses it", (interaction) => {
  vi.useFakeTimers();
  const onClose = vi.fn();
  render(<Toast id="notice" message="Saved" type="success" duration={1000} onClose={onClose} />);
  const toast = screen.getByRole("alert");

  act(() => vi.advanceTimersByTime(400));
  if (interaction === "hover") fireEvent.mouseEnter(toast);
  else fireEvent.click(toast);

  act(() => vi.advanceTimersByTime(2000));
  expect(toast.style.opacity).toBe("1");
  expect(onClose).not.toHaveBeenCalled();

  if (interaction === "hover") fireEvent.mouseLeave(toast);
  else fireEvent.click(toast);

  act(() => vi.advanceTimersByTime(599));
  expect(toast.style.opacity).toBe("1");
  act(() => vi.advanceTimersByTime(1));
  expect(toast.style.opacity).toBe("0");

  act(() => vi.advanceTimersByTime(1000));
  expect(onClose).toHaveBeenCalledExactlyOnceWith("notice");
});
