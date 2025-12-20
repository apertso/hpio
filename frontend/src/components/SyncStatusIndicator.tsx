import React, { useEffect, useState } from "react";
import {
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  CloudIcon,
} from "@heroicons/react/24/outline";
import { CloudIcon as CloudSlashIcon } from "@heroicons/react/24/solid"; // Using solid for slash variant metaphor or custom
import { useOffline } from "../context/OfflineContext";
import { useAuth } from "../context/AuthContext";

interface SyncStatusIndicatorProps {
  className?: string;
}

type SyncState = "idle" | "syncing" | "success" | "error" | "offline";

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  className = "",
}) => {
  const { syncStatus, isOffline, queueStats } = useOffline();
  const { isAuthenticated } = useAuth();

  const [displayState, setDisplayState] = useState<SyncState>("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  // Handle state transitions
  useEffect(() => {
    if (!isAuthenticated) {
      setDisplayState("idle");
      return;
    }

    if (isOffline) {
      setDisplayState("offline");
      return;
    }

    if (syncStatus.isSyncing || queueStats.inProgress) {
      setDisplayState("syncing");
      return;
    }

    // Transition from syncing to result
    if (displayState === "syncing") {
      if (syncStatus.message && syncStatus.message.includes("failed")) {
        setDisplayState("error");
        setResultMessage("Ошибка");
        const timer = setTimeout(() => setDisplayState("idle"), 3000);
        return () => clearTimeout(timer);
      } else {
        setDisplayState("success");
        setResultMessage("Готово");
        const timer = setTimeout(() => setDisplayState("idle"), 3000);
        return () => clearTimeout(timer);
      }
    }

    // If we have pending items but not syncing, show idle with count (or just idle)
    if (queueStats.total > 0 && !queueStats.inProgress) {
      setDisplayState("idle"); // Or a specific "pending" state if desired
    }
  }, [
    isAuthenticated,
    isOffline,
    syncStatus.isSyncing,
    queueStats.inProgress,
    syncStatus.message,
    queueStats.total,
    displayState,
  ]);

  if (!isAuthenticated || displayState === "idle") {
    if (queueStats.total > 0) {
       // Show simple pending state if idle but items exist
       return (
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${className}`}
          title="Ожидание синхронизации"
        >
           <CloudIcon className="h-4 w-4 text-gray-500" />
           <span className="text-[10px] font-medium text-gray-500">
             {queueStats.total}
           </span>
        </div>
       )
    }
    return null;
  }

  const getStatusConfig = () => {
    switch (displayState) {
      case "offline":
        return {
          icon: CloudSlashIcon, // Using Solid Cloud as base, realistically would want a slash icon but this suffices for "solid" look or distinct
          text: "Офлайн",
          style: "text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
          iconStyle: "text-gray-400",
        };
      case "syncing":
        return {
          icon: CloudArrowUpIcon,
          text: "Обновление",
          style: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800",
          iconStyle: "animate-bounce text-blue-500",
        };
      case "success":
        return {
          icon: CheckCircleIcon,
          text: resultMessage || "Готово",
          style: "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800",
          iconStyle: "text-green-500",
        };
      case "error":
        return {
          icon: XCircleIcon,
          text: resultMessage || "Ошибка",
          style: "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800",
          iconStyle: "text-red-500",
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all duration-300 ${config.style} ${className}`}
    >
      <Icon className={`h-4 w-4 ${config.iconStyle}`} />
      <span className="text-xs font-medium hidden sm:inline-block">
        {config.text}
      </span>
    </div>
  );
};

export default SyncStatusIndicator;
