import { describe, expect, it } from "vitest";
import { PaymentData } from "../../types/paymentData";
import { buildMergeOverduePath, groupOverdueBySeries } from "../groupOverduePayments";

const payment = (overrides: Partial<PaymentData>): PaymentData => ({
  id: "p",
  title: "Платеж",
  amount: 100,
  currency: "RUB",
  dueDate: "2026-08-15",
  status: "overdue",
  remind: false,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

describe("groupOverdueBySeries", () => {
  it("собирает пропущенные периоды серии в одну строку с реальным платежом во главе", () => {
    const items = groupOverdueBySeries([
      payment({ id: "virtual:s1:2026-09-15", seriesId: "s1", dueDate: "2026-09-15", isVirtual: true }),
      payment({ id: "real-1", seriesId: "s1", dueDate: "2026-08-15" }),
      payment({ id: "single", dueDate: "2026-08-20" }),
      payment({ id: "virtual:s1:2026-10-15", seriesId: "s1", dueDate: "2026-10-15", isVirtual: true }),
    ]);

    expect(items).toHaveLength(2);
    expect(items[0].key).toBe("series:s1");
    expect(items[0].payment.id).toBe("real-1");
    expect(items[0].occurrences.map((p) => p.dueDate)).toEqual([
      "2026-08-15",
      "2026-09-15",
      "2026-10-15",
    ]);
    expect(items[1].payment.id).toBe("single");
    expect(items[1].occurrences).toHaveLength(1);
  });

  it("не группирует серию с единственным платежом", () => {
    const items = groupOverdueBySeries([
      payment({ id: "a", seriesId: "s1" }),
      payment({ id: "b", seriesId: "s2" }),
    ]);

    expect(items.map((i) => i.key)).toEqual(["a", "b"]);
  });
});

describe("buildMergeOverduePath", () => {
  it("ведет на реальный платеж с суммой и датой последнего периода", () => {
    const path = buildMergeOverduePath([
      payment({ id: "virtual:s1:2026-10-15", seriesId: "s1", dueDate: "2026-10-15", isVirtual: true, amount: 100.1 }),
      payment({ id: "real-1", seriesId: "s1", dueDate: "2026-08-15", amount: 100.1 }),
      payment({ id: "virtual:s1:2026-09-15", seriesId: "s1", dueDate: "2026-09-15", isVirtual: true, amount: 100.1 }),
    ]);

    expect(path).toBe("/payments/edit/real-1?mergeUntil=2026-10-15&mergeCount=3&mergeTotal=300.3");
  });

  it("возвращает null без реального платежа", () => {
    expect(buildMergeOverduePath([payment({ id: "virtual:x", isVirtual: true })])).toBeNull();
  });
});
