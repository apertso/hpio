import { useState, type ReactElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ToolbarSearch from "./ToolbarSearch";

afterEach(cleanup);

function SearchHarness({ initialValue = "" }): ReactElement {
  const [value, setValue] = useState(initialValue);
  const [expanded, setExpanded] = useState(false);
  return (
    <ToolbarSearch
      value={value}
      onChange={setValue}
      expanded={expanded}
      onExpandedChange={setExpanded}
      placeholder="Поиск по названию..."
    />
  );
}

describe("Поиск в панели инструментов", () => {
  it("раскрывает поле по нажатию и переводит в него фокус", () => {
    render(<SearchHarness />);
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Поиск..." }));
    expect(screen.getByRole("textbox")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Поиск..." })).toHaveAttribute("aria-expanded", "true");
  });

  it.each(["Escape", "button"])("очищает запрос, сворачивает поле и возвращает фокус: %s", (action) => {
    render(<SearchHarness />);
    const trigger = screen.getByRole("button", { name: "Поиск..." });
    fireEvent.click(trigger);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Аренда" } });
    if (action === "Escape") {
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    } else {
      fireEvent.click(screen.getByRole("button", { name: "Очистить поиск" }));
    }
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("показывает сохранённый запрос, чтобы фильтрация не оставалась скрытой", () => {
    render(<SearchHarness initialValue="Аренда" />);
    expect(screen.getByRole("textbox")).toHaveValue("Аренда");
    fireEvent.click(screen.getByRole("button", { name: "Очистить поиск" }));
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
