import { afterEach, describe, expect, it } from "vitest";
import {
  canGoBackInApp,
  getDetailParentPath,
  resolveRouteBack,
} from "../routeBack";
import { dispatchBackToLayers, registerBackHandler } from "../backHandlers";

describe("resolveRouteBack", () => {
  it("сворачивает приложение на корневых экранах", () => {
    expect(resolveRouteBack("/dashboard", true, true)).toEqual({ type: "exit" });
    expect(resolveRouteBack("/login", false, true)).toEqual({ type: "exit" });
    expect(resolveRouteBack("/", false, false)).toEqual({ type: "exit" });
  });

  it("из разделов меню ведёт на главную", () => {
    for (const path of ["/payments", "/settings", "/categories", "/tags", "/sources", "/incomes", "/automation-rules"]) {
      expect(resolveRouteBack(path, true, true)).toEqual({ type: "navigate", to: "/dashboard" });
    }
  });

  it("с экрана редактирования возвращается по истории, а без неё — к списку", () => {
    expect(resolveRouteBack("/payments/edit/42", true, true)).toEqual({ type: "history" });
    expect(resolveRouteBack("/payments/new", true, false)).toEqual({ type: "navigate", to: "/payments" });
    expect(resolveRouteBack("/tags/edit/7", true, false)).toEqual({ type: "navigate", to: "/tags" });
    expect(resolveRouteBack("/sources/new", true, false)).toEqual({ type: "navigate", to: "/sources" });
  });

  it("с регистрации и восстановления пароля ведёт на вход", () => {
    expect(resolveRouteBack("/register", false, true)).toEqual({ type: "navigate", to: "/login" });
    expect(resolveRouteBack("/forgot-password", false, false)).toEqual({ type: "navigate", to: "/login" });
  });

  it("с прочих экранов идёт по истории или домой", () => {
    expect(resolveRouteBack("/terms", false, true)).toEqual({ type: "history" });
    expect(resolveRouteBack("/en/privacy", false, false)).toEqual({ type: "navigate", to: "/login" });
    expect(resolveRouteBack("/unknown", true, false)).toEqual({ type: "navigate", to: "/dashboard" });
  });
});

describe("getDetailParentPath", () => {
  it("находит родительский список только для форм", () => {
    expect(getDetailParentPath("/categories/edit/1")).toBe("/categories");
    expect(getDetailParentPath("/categories")).toBeNull();
    expect(getDetailParentPath("/payments/edit")).toBeNull();
  });
});

describe("canGoBackInApp", () => {
  afterEach(() => {
    window.history.replaceState(null, "");
  });

  it("опирается на порядковый номер записи React Router", () => {
    window.history.replaceState({ idx: 0 }, "");
    expect(canGoBackInApp()).toBe(false);
    window.history.replaceState({ idx: 3 }, "");
    expect(canGoBackInApp()).toBe(true);
    window.history.replaceState(null, "");
    expect(canGoBackInApp()).toBe(false);
  });
});

describe("dispatchBackToLayers", () => {
  it("закрывает верхний слой и пропускает скрытые", () => {
    const calls: string[] = [];
    const offBottom = registerBackHandler(() => {
      calls.push("bottom");
      return true;
    });
    const offHidden = registerBackHandler(() => {
      calls.push("hidden");
      return false;
    });

    expect(dispatchBackToLayers()).toBe(true);
    expect(calls).toEqual(["hidden", "bottom"]);

    offHidden();
    offBottom();
    expect(dispatchBackToLayers()).toBe(false);
  });
});
