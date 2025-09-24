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

class OfflineStorage {
  private dbName = "hochuplachu_offline_db";
  private dbVersion = 1;
  private stores = {
    payments: "payments",
    categories: "categories",
    user: "user",
    metadata: "metadata",
  };

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

        // Create object stores
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

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [
          this.stores.payments,
          this.stores.categories,
          this.stores.user,
          this.stores.metadata,
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

