import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { syncService, QueueStats } from "../utils/syncService";
import { ConnectionStatus } from "../types/connection";
import { offlineStorage, OfflineData } from "../utils/offlineStorage";
import logger from "../utils/logger";
import { useToast } from "./ToastContext";
import { useAuth } from "./AuthContext";

interface OfflineContextType {
  connectionStatus: ConnectionStatus;
  isOnline: boolean;
  isOffline: boolean;
  syncStatus: SyncStatus;
  queueStats: QueueStats;
  lastSyncTime: number | null;
  syncData: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
  exportOfflineData: () => Promise<OfflineData>;
  importOfflineData: (data: OfflineData) => Promise<void>;
  showOfflineToast: () => void;
}

interface SyncStatus {
  isSyncing: boolean;
  progress: number;
  message: string;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
};

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({
  children,
}) => {
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    syncService.getConnectionStatus()
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    progress: 0,
    message: "",
  });
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(
    syncService.getLastSyncTime()
  );
  const lastOfflineToastTimeRef = useRef<number>(0);
  const offlineToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [queueStats, setQueueStats] = useState<QueueStats>(
    syncService.getQueueStats()
  );

  useEffect(() => {
    return () => {
      if (offlineToastTimeoutRef.current) {
        clearTimeout(offlineToastTimeoutRef.current);
      }
    };
  }, []);

  // Функция для отображения тоста об отсутствии соединения с throttling
  const showOfflineToast = React.useCallback(() => {
    const now = Date.now();
    const lastToastAt = lastOfflineToastTimeRef.current;
    const timeSinceLastToast = now - lastToastAt;

    // Показывать тост не чаще одного раза в минуту
    if (timeSinceLastToast < 60 * 1000) {
      return;
    }

    if (offlineToastTimeoutRef.current) {
      clearTimeout(offlineToastTimeoutRef.current);
    }

    offlineToastTimeoutRef.current = setTimeout(() => {
      offlineToastTimeoutRef.current = null;

      const isStillOffline =
        !navigator.onLine ||
        syncService.getConnectionStatus() === ConnectionStatus.OFFLINE;

      if (!isStillOffline) {
        return;
      }

      lastOfflineToastTimeRef.current = Date.now();
      showToast(
        "Нет подключения к интернету. Приложение продолжит работать с ранее загруженными данными.",
        "info",
        5000
      );
    }, 500);
  }, [showToast]);

  useEffect(() => {
    const handleConnectionChange = (status: ConnectionStatus) => {
      setConnectionStatus(status);
      logger.info(`Connection status changed to: ${status}`);

      // Show toast when going offline
      if (status === ConnectionStatus.OFFLINE) {
        showOfflineToast();
      }
    };

    const handleSyncStart = () => {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: true,
        message: "Syncing data...",
      }));
    };

    const handleSyncProgress = (progress: number, message: string) => {
      setSyncStatus((prev) => ({ ...prev, progress, message }));
    };

    const handleSyncComplete = (timestamp: number) => {
      setSyncStatus({ isSyncing: false, progress: 0, message: "" });
      setLastSyncTime(timestamp);
      logger.info("Data sync completed successfully");
    };

    const handleSyncError = (error: string) => {
      setSyncStatus({
        isSyncing: false,
        progress: 0,
        message: `Sync failed: ${error}`,
      });
      logger.error("Data sync failed:", error);
      showToast(`Ошибка синхронизации: ${error}`, "error");
    };

    // Subscribe to sync service events
    syncService.onConnectionChange = handleConnectionChange;
    syncService.onSyncStart = handleSyncStart;
    syncService.onSyncProgress = handleSyncProgress;
    syncService.onSyncComplete = handleSyncComplete;
    syncService.onSyncError = handleSyncError;
    syncService.onQueueUpdate = (stats) => {
      setQueueStats(stats);
    };

    // Initial sync if online and authenticated
    if (syncService.isOnline() && isAuthenticated) {
      syncService.syncAllData().catch((error) => {
        logger.error("Initial sync failed:", error);
      });
    }

    const handleOfflineApiRequest = () => {
      showOfflineToast();
    };

    window.addEventListener("offline-api-request", handleOfflineApiRequest);

    return () => {
      // Cleanup listeners
      syncService.onConnectionChange = undefined;
      syncService.onSyncStart = undefined;
      syncService.onSyncProgress = undefined;
      syncService.onSyncComplete = undefined;
      syncService.onSyncError = undefined;
      syncService.onQueueUpdate = undefined;
      window.removeEventListener(
        "offline-api-request",
        handleOfflineApiRequest
      );
    };
  }, [isAuthenticated, showOfflineToast, showToast]);

  const syncData = async () => {
    try {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: true,
        message: "Syncing data...",
      }));
      await syncService.forceSync();
      setSyncStatus({ isSyncing: false, progress: 0, message: "" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown sync error";
      setSyncStatus({
        isSyncing: false,
        progress: 0,
        message: `Sync failed: ${errorMessage}`,
      });
      showToast(`Ошибка синхронизации: ${errorMessage}`, "error");
      throw error;
    }
  };

  const clearOfflineData = async () => {
    try {
      await syncService.clearOfflineData();
      logger.info("Offline data cleared");
    } catch (error) {
      logger.error("Failed to clear offline data:", error);
      throw error;
    }
  };

  const exportOfflineData = async () => {
    try {
      return await offlineStorage.exportData();
    } catch (error) {
      logger.error("Failed to export offline data:", error);
      throw error;
    }
  };

  const importOfflineData = async (
    data: import("../utils/offlineStorage").OfflineData
  ) => {
    try {
      await offlineStorage.importData(data);
      logger.info("Offline data imported successfully");
    } catch (error) {
      logger.error("Failed to import offline data:", error);
      throw error;
    }
  };

  const isOnline = connectionStatus === ConnectionStatus.ONLINE;
  const isOffline = connectionStatus === ConnectionStatus.OFFLINE;

  const contextValue: OfflineContextType = {
    connectionStatus,
    isOnline,
    isOffline,
    syncStatus,
    queueStats,
    lastSyncTime,
    syncData,
    clearOfflineData,
    exportOfflineData,
    importOfflineData,
    showOfflineToast,
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
};
