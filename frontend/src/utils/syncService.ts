import axiosInstance from "../api/axiosInstance";
import { offlineStorage, SyncResult } from "./offlineStorage";
import { PaymentData } from "../types/paymentData";
import logger from "./logger";

export enum ConnectionStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  SYNCING = "syncing",
}

class SyncService {
  private connectionStatus: ConnectionStatus = ConnectionStatus.ONLINE;
  private syncQueue: Array<() => Promise<void>> = [];
  private isSyncing = false;
  private lastSyncTime: number | null = null;

  // Event handlers
  public onConnectionChange?: (status: ConnectionStatus) => void;
  public onSyncStart?: () => void;
  public onSyncProgress?: (progress: number, message: string) => void;
  public onSyncComplete?: (timestamp: number) => void;
  public onSyncError?: (error: string) => void;

  constructor() {
    this.setupNetworkListener();
    this.startPeriodicSync();
  }

  private setupNetworkListener(): void {
    window.addEventListener("online", () => {
      this.handleConnectionChange(ConnectionStatus.ONLINE);
    });

    window.addEventListener("offline", () => {
      this.handleConnectionChange(ConnectionStatus.OFFLINE);
    });

    // Initial status check
    this.updateConnectionStatus();
  }

  private updateConnectionStatus(): void {
    this.connectionStatus = navigator.onLine
      ? ConnectionStatus.ONLINE
      : ConnectionStatus.OFFLINE;
  }

  private handleConnectionChange(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.onConnectionChange?.(status);

    if (status === ConnectionStatus.ONLINE && this.syncQueue.length > 0) {
      this.processSyncQueue();
    }
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public isOnline(): boolean {
    return this.connectionStatus === ConnectionStatus.ONLINE;
  }

  public async syncAllData(): Promise<SyncResult> {
    if (!this.isOnline()) {
      return {
        success: false,
        error: "No internet connection",
      };
    }

    try {
      this.connectionStatus = ConnectionStatus.SYNCING;
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

      this.onSyncProgress?.(100, "Sync completed");
      this.onSyncComplete?.(Date.now());

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
      this.connectionStatus = ConnectionStatus.ONLINE;
    }
  }

  private async syncPayments(): Promise<void> {
    try {
      const response = await axiosInstance.get("/payments/list");
      const payments: PaymentData[] = response.data;

      await offlineStorage.storePayments(payments);
      logger.info(`Synced ${payments.length} payments`);
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
    categories: any[];
    user: any;
  }> {
    const [payments, categories, user] = await Promise.all([
      offlineStorage.getPayments(),
      offlineStorage.getCategories(),
      offlineStorage.getUser(),
    ]);

    return { payments, categories, user };
  }

  public async queueSyncOperation(
    operation: () => Promise<void>
  ): Promise<void> {
    this.syncQueue.push(operation);

    if (this.isOnline() && !this.isSyncing) {
      await this.processSyncQueue();
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;

    while (this.syncQueue.length > 0 && this.isOnline()) {
      const operation = this.syncQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          logger.error("Sync operation failed:", error);
          // Re-queue failed operation for retry
          this.syncQueue.unshift(operation);
          break;
        }
      }
    }

    this.isSyncing = false;
  }

  private startPeriodicSync(): void {
    // Sync every 5 minutes when online
    setInterval(() => {
      if (this.isOnline()) {
        this.syncAllData().catch((error) => {
          logger.error("Periodic sync failed:", error);
        });
      }
    }, 5 * 60 * 1000);
  }

  public async forceSync(): Promise<SyncResult> {
    return await this.syncAllData();
  }

  public async clearOfflineData(): Promise<void> {
    await offlineStorage.clearAll();
  }

  public getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }
}

export const syncService = new SyncService();
