import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { syncService, ConnectionStatus } from "../utils/syncService";
import { offlineStorage } from "../utils/offlineStorage";
import logger from "../utils/logger";

interface OfflineContextType {
  connectionStatus: ConnectionStatus;
  isOnline: boolean;
  isOffline: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  syncData: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
  exportOfflineData: () => Promise<any>;
  importOfflineData: (data: any) => Promise<void>;
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

  useEffect(() => {
    const handleConnectionChange = (status: ConnectionStatus) => {
      setConnectionStatus(status);
      logger.info(`Connection status changed to: ${status}`);
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
    };

    // Subscribe to sync service events
    syncService.onConnectionChange = handleConnectionChange;
    syncService.onSyncStart = handleSyncStart;
    syncService.onSyncProgress = handleSyncProgress;
    syncService.onSyncComplete = handleSyncComplete;
    syncService.onSyncError = handleSyncError;

    // Initial sync if online
    if (syncService.isOnline()) {
      syncService.syncAllData().catch((error) => {
        logger.error("Initial sync failed:", error);
      });
    }

    return () => {
      // Cleanup listeners
      syncService.onConnectionChange = undefined;
      syncService.onSyncStart = undefined;
      syncService.onSyncProgress = undefined;
      syncService.onSyncComplete = undefined;
      syncService.onSyncError = undefined;
    };
  }, []);

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

  const importOfflineData = async (data: any) => {
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
    lastSyncTime,
    syncData,
    clearOfflineData,
    exportOfflineData,
    importOfflineData,
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
};

