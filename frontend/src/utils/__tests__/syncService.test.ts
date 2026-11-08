import { AxiosHeaders } from "axios";
import { expect, it, vi } from "vitest";
import axiosInstance from "../../api/axiosInstance";
import type { PaymentData } from "../../types/paymentData";
import { offlineStorage, type QueuedRequest } from "../offlineStorage";
import { syncService } from "../syncService";

vi.mock("../../api/axiosInstance", () => ({
  default: { defaults: { baseURL: "http://localhost/api" }, request: vi.fn() },
}));

vi.mock("../offlineStorage", () => ({
  offlineStorage: {
    init: vi.fn(),
    getLastSync: vi.fn(),
    getQueuedRequests: vi.fn().mockResolvedValue([]),
    getPayments: vi.fn(),
    storePayments: vi.fn(),
    enqueueRequest: vi.fn(),
    updateQueuedRequest: vi.fn(),
    deleteQueuedRequest: vi.fn(),
  },
}));

it("reconciles a queued file upload with the server ID of a payment created offline", async () => {
  const queue = new Map<string, QueuedRequest>();
  let payments: PaymentData[] = [];
  vi.mocked(offlineStorage.getQueuedRequests).mockImplementation(async () => [...queue.values()]);
  vi.mocked(offlineStorage.enqueueRequest).mockImplementation(async (request) => {
    queue.set(request.id, request);
  });
  vi.mocked(offlineStorage.updateQueuedRequest).mockImplementation(async (id, update) => {
    const existing = queue.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...update };
    queue.set(id, updated);
    return updated;
  });
  vi.mocked(offlineStorage.deleteQueuedRequest).mockImplementation(async (id) => {
    queue.delete(id);
  });
  vi.mocked(offlineStorage.getPayments).mockImplementation(async () => [...payments]);
  vi.mocked(offlineStorage.storePayments).mockImplementation(async (next) => {
    payments = next;
  });

  const connection = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  window.dispatchEvent(new Event("offline"));

  try {
    const headers = new AxiosHeaders();
    const create = await syncService.enqueueOfflineRequest({
      method: "post",
      url: "/payments",
      headers,
      data: { title: "Internet", amount: 25, dueDate: "2026-11-08", builtinIconName: "wifi" },
    });
    const [localPayment] = payments;
    expect(create.data).toEqual(localPayment);
    expect(localPayment.isVirtual).toBe(true);

    const attachment = new FormData();
    attachment.append("paymentFile", new File(["receipt"], "receipt.pdf"));
    await syncService.enqueueOfflineRequest({
      method: "post",
      url: `/files/upload/payment/${localPayment.id}`,
      headers,
      data: attachment,
    });
    expect(payments[0].fileName).toBe("receipt.pdf");

    const response = { status: 200, statusText: "OK", headers: {}, config: { headers } };
    vi.mocked(axiosInstance.request)
      .mockResolvedValueOnce({ ...response, data: { ...localPayment, id: "server-id" } })
      .mockResolvedValueOnce({ ...response, data: {
        file: { fileName: "receipt.pdf", filePath: "uploads/receipt.pdf" },
      } });
    const completed = new Promise<void>((resolve) => {
      syncService.onSyncComplete = () => resolve();
    });
    connection.mockReturnValue(true);
    window.dispatchEvent(new Event("online"));
    await completed;

    expect(axiosInstance.request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: "/files/upload/payment/server-id",
    }));
    expect(payments).toEqual([expect.objectContaining({
      id: "server-id",
      isVirtual: false,
      filePath: "uploads/receipt.pdf",
    })]);
    expect(queue.size).toBe(0);
  } finally {
    syncService.onSyncComplete = undefined;
    connection.mockRestore();
  }
});
