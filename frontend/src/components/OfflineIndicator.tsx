import React from "react";
import { useOffline } from "../context/OfflineContext";
import { ConnectionStatus } from "../utils/syncService";
import {
  WifiIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CloudIcon,
} from "@heroicons/react/24/outline";

interface OfflineIndicatorProps {
  className?: string;
  showSyncStatus?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = "",
  showSyncStatus = true,
}) => {
  const { connectionStatus, isOnline, isOffline, syncStatus, syncData } =
    useOffline();

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case ConnectionStatus.ONLINE:
        return <WifiIcon className="h-4 w-4 text-green-500" />;
      case ConnectionStatus.OFFLINE:
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      case ConnectionStatus.SYNCING:
        return <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <CloudIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case ConnectionStatus.ONLINE:
        return "Online";
      case ConnectionStatus.OFFLINE:
        return "Offline - Using cached data";
      case ConnectionStatus.SYNCING:
        return syncStatus.message || "Syncing...";
      default:
        return "Unknown status";
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case ConnectionStatus.ONLINE:
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case ConnectionStatus.OFFLINE:
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case ConnectionStatus.SYNCING:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  if (!showSyncStatus && connectionStatus === ConnectionStatus.ONLINE) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()} ${className}`}
    >
      {getStatusIcon()}
      <span>{getStatusMessage()}</span>
      {connectionStatus === ConnectionStatus.OFFLINE && (
        <button
          onClick={syncData}
          className="ml-2 text-current hover:opacity-75 transition-opacity"
          title="Try to sync"
        >
          <ArrowPathIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default OfflineIndicator;

