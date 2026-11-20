import { useLanguage } from "../context/LanguageContext";
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
  const { t } = useLanguage();
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
        setResultMessage(t("Ошибка"));
        const timer = setTimeout(() => setDisplayState("idle"), 3000);
        return () => clearTimeout(timer);
      } else {
        // Успешная синхронизация не требует внимания — индикатор просто скрывается
        setDisplayState("idle");
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
    displayState, t,
  ]);

  if (!isAuthenticated || displayState === "idle") {
    if (queueStats.total > 0) {
       // Show simple pending state if idle but items exist
       return (
        <div
          className={`flex h-6 items-center gap-1.5 px-2 rounded-md border border-[var(--ui-border)] text-gray-500 ${className}`}
          title={t("Ожидание синхронизации")}
        >
           <CloudIcon className="size-3.5 text-gray-400" />
           <span className="text-xs font-medium tabular-nums text-gray-500">
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
          text: t("Офлайн"),
          style: "text-gray-500 dark:text-gray-400",
          iconStyle: "text-gray-400",
        };
      case "syncing":
        return {
          icon: CloudArrowUpIcon,
          text: t("Обновление"),
          style: "text-gray-600 dark:text-gray-300",
          iconStyle: "animate-pulse text-indigo-500",
        };
      case "success":
        return {
          icon: CheckCircleIcon,
          text: resultMessage || t("Готово"),
          style: "text-gray-600 dark:text-gray-300",
          iconStyle: "text-green-500",
        };
      case "error":
        return {
          icon: XCircleIcon,
          text: resultMessage || t("Ошибка"),
          style: "text-red-600 dark:text-red-400",
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
      className={`flex h-6 items-center gap-1.5 px-2 rounded-md border border-[var(--ui-border)] transition-colors duration-300 ${config.style} ${className}`}
    >
      <Icon className={`size-3.5 ${config.iconStyle}`} />
      <span className="text-xs font-medium hidden sm:inline-block">
        {config.text}
      </span>
    </div>
  );
};

export default SyncStatusIndicator;
