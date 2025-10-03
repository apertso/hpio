import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useOffline } from "../context/OfflineContext";

interface SyncStatusIndicatorProps {
  className?: string;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  className = "",
}) => {
  const { syncStatus, queueStats } = useOffline();
  const total = queueStats.total;
  const completed = Math.min(queueStats.completed, total);
  const isSyncing = syncStatus.isSyncing || queueStats.inProgress;
  const shouldShow = total > 0 || isSyncing;

  if (!shouldShow) {
    return null;
  }

  const tooltip = total > 0
    ? `Синхронизация: ${completed}/${total}`
    : syncStatus.message || "Синхронизация";

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1 rounded-full border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 text-xs font-medium text-gray-700 dark:text-gray-200 ${className}`}
      title={tooltip}
    >
      <ArrowPathIcon
        className={`h-4 w-4 ${
          isSyncing ? "animate-spin text-blue-500" : "text-gray-400"
        }`}
      />
      <span className="hidden sm:inline">Синхронизация</span>
      {total > 0 && (
        <span className="text-gray-500 dark:text-gray-400">
          {`${completed}/${total}`}
        </span>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
