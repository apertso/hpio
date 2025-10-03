import { PaymentData } from "../types/paymentData";

export interface OfflineData {
  payments: PaymentData[];
  categories: any[];
  user: any;
  lastSync: number;
  version: number;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  syncedItems?: number;
}

export type SerializedRequestBody =
  | { type: "none" }
  | { type: "json"; value: unknown }
  | { type: "formData"; entries: SerializedFormDataEntry[] };

export type SerializedFormDataEntry =
  | { type: "text"; name: string; value: string }
  | {
      type: "file";
      name: string;
      fileName: string;
      mimeType: string;
      lastModified: number;
      blob: Blob;
    };

export interface RequestReservation {
  type: string;
  data?: unknown;
}

export interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body: SerializedRequestBody;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
  availableAt: number;
  lastError?: string;
  reservation?: RequestReservation | null;
}

class OfflineStorage {
  private dbName = "hochuplachu_offline_db";
  private dbVersion = 2;
  private stores = {
    payments: "payments",
    categories: "categories",
    user: "user",
    metadata: "metadata",
    queue: "requestQueue",
  } as const;

  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error("Failed to open offline database"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.stores.payments)) {
          const paymentsStore = db.createObjectStore(this.stores.payments, {
            keyPath: "id",
          });
          paymentsStore.createIndex("status", "status");
          paymentsStore.createIndex("dueDate", "dueDate");
          paymentsStore.createIndex("categoryId", "categoryId");
        }

        if (!db.objectStoreNames.contains(this.stores.categories)) {
          db.createObjectStore(this.stores.categories, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(this.stores.user)) {
          db.createObjectStore(this.stores.user);
        }

        if (!db.objectStoreNames.contains(this.stores.metadata)) {
          db.createObjectStore(this.stores.metadata);
        }

        if (!db.objectStoreNames.contains(this.stores.queue)) {
          db.createObjectStore(this.stores.queue, { keyPath: "id" });
        }
      };
    });
  }

  async storePayments(payments: PaymentData[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.stores.payments],
        "readwrite"
      );
      const store = transaction.objectStore(this.stores.payments);

      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        payments.forEach((payment) => {
          store.put(payment);
        });
        resolve();
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  async getPayments(): Promise<PaymentData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.stores.payments],
        "readonly"
      );
      const store = transaction.objectStore(this.stores.payments);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async storeCategories(categories: any[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.stores.categories],
        "readwrite"
      );
      const store = transaction.objectStore(this.stores.categories);

      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        categories.forEach((category) => {
          store.put(category);
        });
        resolve();
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  async getCategories(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.stores.categories],
        "readonly"
      );
      const store = transaction.objectStore(this.stores.categories);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async storeUser(user: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.user], "readwrite");
      const store = transaction.objectStore(this.stores.user);
      const request = store.put(user, "current");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUser(): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.user], "readonly");
      const store = transaction.objectStore(this.stores.user);
      const request = store.get("current");

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateLastSync(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.stores.metadata],
        "readwrite"
      );
      const store = transaction.objectStore(this.stores.metadata);
      const request = store.put(
        { key: "lastSync", value: Date.now() },
        "lastSync"
      );

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLastSync(): Promise<number | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.stores.metadata],
        "readonly"
      );
      const store = transaction.objectStore(this.stores.metadata);
      const request = store.get("lastSync");

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  async enqueueRequest(request: QueuedRequest): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.queue], "readwrite");
      const store = transaction.objectStore(this.stores.queue);
      const putRequest = store.put(request);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    });
  }

  async getQueuedRequests(): Promise<QueuedRequest[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.queue], "readonly");
      const store = transaction.objectStore(this.stores.queue);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result as QueuedRequest[]) || [];
        records.sort((a, b) => a.createdAt - b.createdAt);
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateQueuedRequest(
    id: string,
    update: Partial<Omit<QueuedRequest, "id" | "createdAt">>
  ): Promise<QueuedRequest | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.queue], "readwrite");
      const store = transaction.objectStore(this.stores.queue);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const current = getRequest.result as QueuedRequest | undefined;
        if (!current) {
          resolve(null);
          return;
        }

        const updated: QueuedRequest = {
          ...current,
          ...update,
          updatedAt: Date.now(),
        };

        const putRequest = store.put(updated);

        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteQueuedRequest(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.queue], "readwrite");
      const store = transaction.objectStore(this.stores.queue);
      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }

  async clearQueue(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.queue], "readwrite");
      const store = transaction.objectStore(this.stores.queue);
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [
          this.stores.payments,
          this.stores.categories,
          this.stores.user,
          this.stores.metadata,
          this.stores.queue,
        ],
        "readwrite"
      );

      const promises = Object.values(this.stores).map((storeName) => {
        return new Promise((res, rej) => {
          const store = transaction.objectStore(storeName);
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => res(undefined);
          clearRequest.onerror = () => rej(clearRequest.error);
        });
      });

      Promise.all(promises)
        .then(() => resolve())
        .catch(reject);
    });
  }

  async exportData(): Promise<OfflineData> {
    const [payments, categories, user, lastSync] = await Promise.all([
      this.getPayments(),
      this.getCategories(),
      this.getUser(),
      this.getLastSync(),
    ]);

    return {
      payments,
      categories,
      user,
      lastSync: lastSync || Date.now(),
      version: 1,
    };
  }

  async importData(data: OfflineData): Promise<void> {
    await Promise.all([
      this.storePayments(data.payments),
      this.storeCategories(data.categories),
      data.user ? this.storeUser(data.user) : Promise.resolve(),
      this.updateLastSync(),
    ]);
  }
}

export const offlineStorage = new OfflineStorage();
