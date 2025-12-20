import axiosInstance from "../api/axiosInstance";
import {
  offlineStorage,
  SyncResult,
  QueuedRequest,
  SerializedRequestBody,
  SerializedFormDataEntry,
  RequestReservation,
} from "./offlineStorage";
import { PaymentData } from "../types/paymentData";
import logger from "./logger";
import { AxiosHeaders, AxiosRequestConfig, AxiosResponse, Method } from "axios";
import { ConnectionStatus } from "../types/connection";

interface Category {
  id: string;
  name: string;
  builtinIconName?: string | null;
}

export { ConnectionStatus };

export interface QueueStats {
  total: number;
  completed: number;
  inProgress: boolean;
}

interface ReservationBuildResult {
  reservation: RequestReservation | null;
  response: AxiosResponse;
}

const MAX_QUEUE_ATTEMPTS = 5;
const RETRY_INTERVAL_MS = 5000;

class SyncService {
  private connectionStatus: ConnectionStatus = ConnectionStatus.ONLINE;
  private isSyncing = false;
  private isProcessingQueue = false;
  private lastSyncTime: number | null = null;
  private queueCache: QueuedRequest[] = [];
  private queueStats: QueueStats = {
    total: 0,
    completed: 0,
    inProgress: false,
  };

  public onConnectionChange?: (status: ConnectionStatus) => void;
  public onSyncStart?: () => void;
  public onSyncProgress?: (progress: number, message: string) => void;
  public onSyncComplete?: (timestamp: number) => void;
  public onSyncError?: (error: string) => void;
  public onQueueUpdate?: (stats: QueueStats) => void;

  constructor() {
    this.setupNetworkListener();
    this.startPeriodicSync();
    this.initializeQueue().catch((error) => {
      logger.error("Failed to initialize offline queue:", error);
    });
  }

  private async initializeQueue(): Promise<void> {
    try {
      await offlineStorage.init();
      // Загружаем время последней синхронизации из хранилища
      const lastSync = await offlineStorage.getLastSync();
      if (lastSync) {
        this.lastSyncTime = lastSync;
      }
    } catch (error) {
      logger.error("Failed to init offline storage:", error);
    }
    await this.refreshQueueCache();

    // After loading the queue, check if we need to process it
    if (this.isOnline() && this.queueCache.length > 0) {
      logger.info(
        `Found ${this.queueCache.length} queued items on initialization, starting processing`
      );
      this.processQueue().catch((error) => {
        logger.error("Queue processing failed after initialization:", error);
      });
    }
  }

  private setupNetworkListener(): void {
    window.addEventListener("online", () => {
      this.handleConnectionChange(ConnectionStatus.ONLINE);
    });

    window.addEventListener("offline", () => {
      this.handleConnectionChange(ConnectionStatus.OFFLINE);
    });

    this.updateConnectionStatus();
  }

  private updateConnectionStatus(): void {
    const status = navigator.onLine
      ? ConnectionStatus.ONLINE
      : ConnectionStatus.OFFLINE;
    this.setConnectionStatus(status);
    if (status === ConnectionStatus.ONLINE && this.queueCache.length > 0) {
      this.processQueue().catch((error) => {
        logger.error("Queue processing failed:", error);
      });
    }
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus === status) {
      return;
    }
    this.connectionStatus = status;
    this.onConnectionChange?.(status);
  }

  private handleConnectionChange(status: ConnectionStatus): void {
    this.setConnectionStatus(status);
    if (status === ConnectionStatus.ONLINE) {
      this.refreshQueueCache()
        .then(() => {
          if (this.queueCache.length > 0) {
            this.processQueue().catch((error) => {
              logger.error("Queue processing failed:", error);
            });
          }
        })
        .catch((error) => {
          logger.error("Failed to refresh queue on reconnect:", error);
        });
    }
  }

  private async refreshQueueCache(): Promise<void> {
    try {
      this.queueCache = await offlineStorage.getQueuedRequests();
    } catch (error) {
      logger.error("Failed to load queued requests:", error);
      this.queueCache = [];
    }
    this.emitQueueUpdate();
  }

  private emitQueueUpdate(): void {
    const total = this.queueStats.inProgress
      ? this.queueStats.completed + this.queueCache.length
      : this.queueCache.length;
    const stats: QueueStats = {
      total,
      completed: this.queueStats.inProgress ? this.queueStats.completed : 0,
      inProgress: this.queueStats.inProgress,
    };
    this.onQueueUpdate?.(stats);
  }

  public getQueueStats(): QueueStats {
    const total = this.queueStats.inProgress
      ? this.queueStats.completed + this.queueCache.length
      : this.queueCache.length;
    return { ...this.queueStats, total };
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public isOnline(): boolean {
    return this.connectionStatus === ConnectionStatus.ONLINE;
  }

  public async enqueueOfflineRequest(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse> {
    const serializedBody = this.serializeBody(config.data);
    const headers = this.extractHeaders(config.headers);
    const { reservation, response } = await this.buildReservation(
      config,
      serializedBody
    );

    const queuedRequest: QueuedRequest = {
      id: this.generateOfflineId("request"),
      method: ((config.method || "get") as Method).toLowerCase(),
      url: config.url || "",
      headers,
      body: serializedBody,
      attempts: 0,
      maxAttempts: MAX_QUEUE_ATTEMPTS,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      availableAt: Date.now(),
      reservation,
    };

    await offlineStorage.enqueueRequest(queuedRequest);
    await this.applyReservation(reservation);
    await this.refreshQueueCache();

    if (this.isOnline() && !this.isProcessingQueue) {
      this.processQueue().catch((error) => {
        logger.error("Queue processing failed:", error);
      });
    }

    return response;
  }

  public async syncAllData(force: boolean = false): Promise<SyncResult> {
    if (!this.isOnline()) {
      return {
        success: false,
        error: "No internet connection",
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        error: "Sync already in progress",
      };
    }

    // Не синхронизируем данные если последняя синхронизация была менее 5 минут назад (если не принудительно)
    const MIN_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
    // Если время последней синхронизации не в памяти, попробуем загрузить из хранилища
    if (!this.lastSyncTime) {
      try {
        const storedLastSync = await offlineStorage.getLastSync();
        if (storedLastSync) {
          this.lastSyncTime = storedLastSync;
        }
      } catch {
        // Игнорируем ошибку чтения, продолжим синхронизацию
      }
    }
    if (
      !force &&
      this.lastSyncTime &&
      Date.now() - this.lastSyncTime < MIN_SYNC_INTERVAL
    ) {
      logger.info("Skipping sync - last sync was recent");
      return {
        success: true,
        syncedItems: 0,
        error: undefined,
      };
    }

    try {
      this.isSyncing = true;
      this.setConnectionStatus(ConnectionStatus.SYNCING);
      this.onSyncStart?.();

      this.onSyncProgress?.(10, "Syncing payments...");
      const results = await Promise.allSettled([
        this.syncPayments(),
        this.syncCategories(),
        this.syncUser(),
      ]);

      this.onSyncProgress?.(80, "Finalizing sync...");

      const successCount = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      const totalCount = results.length;

      await offlineStorage.updateLastSync();
      this.lastSyncTime = Date.now();

      this.onSyncProgress?.(100, "Sync completed");
      this.onSyncComplete?.(this.lastSyncTime);

      return {
        success: successCount === totalCount,
        syncedItems: successCount,
        error:
          successCount < totalCount ? "Some sync operations failed" : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown sync error";
      logger.error("Sync failed:", error);
      this.onSyncError?.(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this.isSyncing = false;
      if (!this.isProcessingQueue) {
        this.setConnectionStatus(
          navigator.onLine ? ConnectionStatus.ONLINE : ConnectionStatus.OFFLINE
        );
      }
    }
  }

  private async syncPayments(): Promise<void> {
    try {
      // Fetch active payments (upcoming/overdue)
      const activeResponse = await axiosInstance.get("/payments/list");
      const activePayments: PaymentData[] = activeResponse.data;

      // Fetch archived payments (completed/deleted)
      const archivedResponse = await axiosInstance.get("/archive");
      const archivedPayments: PaymentData[] = archivedResponse.data;

      // Combine both lists
      const allPayments = [...activePayments, ...archivedPayments];

      await offlineStorage.storePayments(allPayments);
      logger.info(
        `Synced ${allPayments.length} payments (${activePayments.length} active, ${archivedPayments.length} archived)`
      );
    } catch (error) {
      logger.error("Failed to sync payments:", error);
      throw error;
    }
  }

  private async syncCategories(): Promise<void> {
    try {
      const response = await axiosInstance.get("/categories");
      const categories = response.data;

      await offlineStorage.storeCategories(categories);
      logger.info(`Synced ${categories.length} categories`);
    } catch (error) {
      logger.error("Failed to sync categories:", error);
      throw error;
    }
  }

  private async syncUser(): Promise<void> {
    try {
      const response = await axiosInstance.get("/user/profile");
      const user = response.data;

      await offlineStorage.storeUser(user);
      logger.info("Synced user profile");
    } catch (error) {
      logger.error("Failed to sync user:", error);
      throw error;
    }
  }

  public async getOfflineData(): Promise<{
    payments: PaymentData[];
    categories: Category[];
    user: unknown;
  }> {
    const [payments, categories, user] = await Promise.all([
      offlineStorage.getPayments(),
      offlineStorage.getCategories(),
      offlineStorage.getUser(),
    ]);

    return { payments, categories, user };
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    if (this.queueCache.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    this.queueStats = {
      total: this.queueCache.length,
      completed: 0,
      inProgress: true,
    };
    this.emitQueueUpdate();
    this.setConnectionStatus(ConnectionStatus.SYNCING);
    this.onSyncStart?.();

    try {
      logger.info("Starting queue processing loop");
      while (this.queueCache.length > 0 && navigator.onLine) {
        const current = this.queueCache[0];
        const now = Date.now();

        if (current.availableAt > now) {
          await this.wait(current.availableAt - now);
          await this.refreshQueueCache();
          continue;
        }

        try {
          this.onSyncProgress?.(
            this.calculateProgress(),
            `${current.method.toUpperCase()} ${current.url}`
          );
          const response = await this.sendQueuedRequest(current);
          await this.applyReservationResolution(current, response);
          await offlineStorage.deleteQueuedRequest(current.id);
          this.queueStats.completed += 1;
          await this.refreshQueueCache();
        } catch (error) {
          const attempts = current.attempts + 1;
          const message =
            error instanceof Error ? error.message : "Unknown sync error";

          if (attempts >= current.maxAttempts) {
            await offlineStorage.deleteQueuedRequest(current.id);
            this.queueStats.completed += 1;
            await this.refreshQueueCache();
            this.onSyncError?.(message);
          } else {
            await offlineStorage.updateQueuedRequest(current.id, {
              attempts,
              availableAt: Date.now() + RETRY_INTERVAL_MS,
              lastError: message,
            });
            await this.refreshQueueCache();
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
      this.queueStats = { total: 0, completed: 0, inProgress: false };
      await this.refreshQueueCache();
      if (!this.isSyncing) {
        this.setConnectionStatus(
          navigator.onLine ? ConnectionStatus.ONLINE : ConnectionStatus.OFFLINE
        );
      }
      this.onSyncComplete?.(Date.now());
    }
  }

  private calculateProgress(): number {
    const total = Math.max(
      this.queueStats.total,
      this.queueStats.completed + this.queueCache.length
    );
    if (total === 0) {
      return 100;
    }
    const completed = this.queueStats.completed;
    return Math.min(99, Math.round((completed / total) * 100));
  }

  private async sendQueuedRequest(
    request: QueuedRequest
  ): Promise<AxiosResponse> {
    const data = this.deserializeBody(request.body);
    const headers = {
      ...(request.headers || {}),
      "X-Offline-Replay": "1",
    };

    return axiosInstance.request({
      method: request.method as Method,
      url: request.url,
      data,
      headers,
    });
  }

  private async applyReservation(
    reservation: RequestReservation | null
  ): Promise<void> {
    if (!reservation) {
      return;
    }

    try {
      switch (reservation.type) {
        case "payment:create": {
          const payment = reservation.data?.payment as PaymentData | undefined;
          if (payment) {
            await this.upsertPayment(payment);
          }
          break;
        }
        case "payment:update": {
          const { id, changes } = reservation.data || {};
          if (id && changes) {
            await this.updatePayment(id, changes);
          }
          break;
        }
        case "payment:complete": {
          const { id, completedAt } = reservation.data || {};
          if (id) {
            await this.updatePayment(id, {
              status: "completed",
              completedAt: completedAt || new Date().toISOString(),
            });
          }
          break;
        }
        case "payment:delete": {
          const { id } = reservation.data || {};
          if (id) {
            await this.removePayment(id);
          }
          break;
        }
        case "payment:fileUpload": {
          const { id, fileName } = reservation.data || {};
          if (id && fileName) {
            await this.updatePayment(id, {
              fileName,
              updatedAt: new Date().toISOString(),
            });
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      logger.error("Failed to apply reservation:", error);
    }
  }

  private async applyReservationResolution(
    request: QueuedRequest,
    response: AxiosResponse
  ): Promise<void> {
    const reservation = request.reservation;
    if (!reservation) {
      return;
    }

    try {
      switch (reservation.type) {
        case "payment:create": {
          const offlineId = reservation.data?.offlineId as string | undefined;
          const payment = response.data as PaymentData | undefined;
          if (offlineId && payment) {
            await this.replacePaymentId(offlineId, payment);
            await this.updateQueuedReferences(offlineId, payment.id);
          }
          break;
        }
        case "payment:update": {
          const updated = response.data as PaymentData | undefined;
          if (updated?.id) {
            await this.upsertPayment({ ...updated, isVirtual: false });
          }
          break;
        }
        case "payment:complete": {
          const updated = response.data as PaymentData | undefined;
          if (updated?.id) {
            await this.upsertPayment({ ...updated, isVirtual: false });
          }
          break;
        }
        case "payment:fileUpload": {
          const { id } = reservation.data || {};
          if (id && response.data?.fileName) {
            await this.updatePayment(id, {
              fileName: response.data.fileName,
              filePath: response.data.filePath ?? null,
              updatedAt: new Date().toISOString(),
            });
          }
          break;
        }
        case "payment:delete": {
          const { id } = reservation.data || {};
          if (id) {
            await this.removePayment(id);
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      logger.error("Failed to resolve reservation:", error);
    }
  }

  private async updateQueuedReferences(
    offlineId: string,
    realId: string
  ): Promise<void> {
    if (offlineId === realId) {
      return;
    }

    const queue = await offlineStorage.getQueuedRequests();
    await Promise.all(
      queue
        .filter((item) => item.id && item.url.includes(offlineId))
        .map((item) =>
          offlineStorage.updateQueuedRequest(item.id, {
            url: item.url.replace(offlineId, realId),
          })
        )
    );
  }

  private async upsertPayment(payment: PaymentData): Promise<void> {
    const payments = await offlineStorage.getPayments();
    const index = payments.findIndex((item) => item.id === payment.id);
    if (index >= 0) {
      payments[index] = {
        ...payments[index],
        ...payment,
        updatedAt: payment.updatedAt || new Date().toISOString(),
        isVirtual: payment.isVirtual ?? payments[index].isVirtual,
      };
    } else {
      payments.unshift({
        ...payment,
        updatedAt: payment.updatedAt || new Date().toISOString(),
      });
    }
    await offlineStorage.storePayments(payments);
  }

  private async updatePayment(
    id: string,
    changes: Partial<PaymentData>
  ): Promise<void> {
    const payments = await offlineStorage.getPayments();
    const index = payments.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }
    payments[index] = {
      ...payments[index],
      ...changes,
      updatedAt: new Date().toISOString(),
    } as PaymentData;
    await offlineStorage.storePayments(payments);
  }

  private async removePayment(id: string): Promise<void> {
    const payments = await offlineStorage.getPayments();
    const filtered = payments.filter((item) => item.id !== id);
    if (filtered.length === payments.length) {
      return;
    }
    await offlineStorage.storePayments(filtered);
  }

  private async replacePaymentId(
    offlineId: string,
    payment: PaymentData
  ): Promise<void> {
    const payments = await offlineStorage.getPayments();
    const index = payments.findIndex((item) => item.id === offlineId);
    if (index === -1) {
      await this.upsertPayment({ ...payment, isVirtual: false });
      return;
    }
    payments[index] = { ...payment, isVirtual: false };
    await offlineStorage.storePayments(payments);
  }

  private serializeBody(data: unknown): SerializedRequestBody {
    if (!data) {
      return { type: "none" };
    }

    if (typeof FormData !== "undefined" && data instanceof FormData) {
      const entries: SerializedFormDataEntry[] = [];
      data.forEach((value, key) => {
        if (typeof value === "string") {
          entries.push({ type: "text", name: key, value });
        } else if (value instanceof File) {
          entries.push({
            type: "file",
            name: key,
            fileName: value.name,
            mimeType: value.type,
            lastModified: value.lastModified,
            blob: value,
          });
        }
      });
      return { type: "formData", entries };
    }

    if (typeof data === "object") {
      try {
        const cloned = JSON.parse(JSON.stringify(data));
        return { type: "json", value: cloned };
      } catch (error) {
        logger.warn("Failed to clone request body, storing as-is", error);
      }
    }

    return { type: "json", value: data };
  }

  private deserializeBody(body: SerializedRequestBody): unknown {
    if (!body) {
      return undefined;
    }

    switch (body.type) {
      case "none":
        return undefined;
      case "json":
        return body.value;
      case "formData": {
        const formData = new FormData();
        body.entries.forEach((entry) => {
          if (entry.type === "text") {
            formData.append(entry.name, entry.value);
          } else if (entry.type === "file") {
            const file = new File([entry.blob], entry.fileName, {
              type: entry.mimeType,
              lastModified: entry.lastModified,
            });
            formData.append(entry.name, file);
          }
        });
        return formData;
      }
      default:
        return undefined;
    }
  }

  private extractHeaders(headers: unknown): Record<string, string> {
    if (!headers) {
      return {};
    }

    const raw = headers instanceof AxiosHeaders ? headers.toJSON() : headers;
    const result: Record<string, string> = {};

    Object.entries(raw).forEach(([key, value]) => {
      if (typeof value === "string") {
        result[key.toLowerCase()] = value;
      }
    });

    delete result["x-offline-replay"];
    return result;
  }

  private async buildReservation(
    config: AxiosRequestConfig,
    body: SerializedRequestBody
  ): Promise<ReservationBuildResult> {
    const method = ((config.method || "get") as Method).toLowerCase();
    const url = config.url || "";
    const path = this.getPathname(url);

    const baseResponse: AxiosResponse = {
      data: null,
      status: 202,
      statusText: "Accepted (offline)",
      headers: { "x-offline": "true" },
      config,
    };

    if (method === "post" && path === "/payments" && body.type === "json") {
      const payload = (body.value as Record<string, unknown>) || {};
      const offlineId = this.generateOfflineId("payment");
      const nowIso = new Date().toISOString();

      const payment: PaymentData = {
        id: offlineId,
        title: payload.title,
        amount: Number(payload.amount),
        dueDate: payload.dueDate,
        status: "upcoming",
        remind: !!payload.remind,
        createdAt: nowIso,
        updatedAt: nowIso,
        builtinIconName: payload.builtinIconName || null,
        category: null,
        seriesId: payload.seriesId || null,
        completedAt: null,
        fileName: null,
        filePath: null,
        isVirtual: true,
      };

      baseResponse.data = payment;

      return {
        reservation: {
          type: "payment:create",
          data: {
            payment,
            offlineId,
          },
        },
        response: baseResponse,
      };
    }

    const matchPaymentId = path.match(/^\/payments\/(?<id>[^/]+)$/);
    if (method === "put" && matchPaymentId && body.type === "json") {
      const { id } = matchPaymentId.groups as { id: string };
      const changes = body.value as Record<string, unknown>;
      baseResponse.data = {
        id,
        ...changes,
      };
      return {
        reservation: {
          type: "payment:update",
          data: { id, changes },
        },
        response: baseResponse,
      };
    }

    const matchPaymentComplete = path.match(
      /^\/payments\/(?<id>[^/]+)\/complete$/
    );
    if (method === "put" && matchPaymentComplete && body.type === "json") {
      const { id } = matchPaymentComplete.groups as { id: string };
      const payload = body.value as Record<string, unknown>;
      const completedAt = payload.completedAt || new Date().toISOString();
      baseResponse.data = {
        id,
        status: "completed",
        completedAt,
      };
      return {
        reservation: {
          type: "payment:complete",
          data: { id, completedAt },
        },
        response: baseResponse,
      };
    }

    if (method === "delete" && matchPaymentId) {
      const { id } = matchPaymentId.groups as { id: string };
      const response: AxiosResponse = {
        ...baseResponse,
        status: 204,
        statusText: "No Content (offline)",
        data: null,
      };
      return {
        reservation: {
          type: "payment:delete",
          data: { id },
        },
        response,
      };
    }

    const matchFileUpload = path.match(
      /^\/files\/upload\/payment\/(?<id>[^/]+)$/
    );
    if (method === "post" && matchFileUpload && body.type === "formData") {
      const { id } = matchFileUpload.groups as { id: string };
      const fileEntry = body.entries.find((entry) => entry.type === "file") as
        | SerializedFormDataEntry
        | undefined;
      const fileName =
        fileEntry && fileEntry.type === "file" ? fileEntry.fileName : "";
      baseResponse.data = { success: true, fileName };
      return {
        reservation: {
          type: "payment:fileUpload",
          data: { id, fileName },
        },
        response: baseResponse,
      };
    }

    if (body.type === "json") {
      return {
        reservation: null,
        response: {
          ...baseResponse,
          data: body.value,
        },
      };
    }

    return {
      reservation: null,
      response: baseResponse,
    };
  }

  private getPathname(url: string): string {
    try {
      const base = axiosInstance.defaults.baseURL || window.location.origin;
      return new URL(url, base).pathname;
    } catch {
      return url;
    }
  }

  private generateOfflineId(prefix: string): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private startPeriodicSync(): void {
    setInterval(() => {
      if (this.isOnline() && !this.isSyncing) {
        this.syncAllData().catch((error) => {
          logger.error("Periodic sync failed:", error);
        });
      }
    }, 5 * 60 * 1000);
  }

  public async forceSync(): Promise<SyncResult> {
    return await this.syncAllData(true);
  }

  public async clearOfflineData(): Promise<void> {
    await offlineStorage.clearAll();
    await this.refreshQueueCache();
  }

  public getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }
}

export const syncService = new SyncService();
