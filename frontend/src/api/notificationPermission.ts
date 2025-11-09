import { isTauri } from "../utils/platform";

export interface PermissionStatus {
  granted: boolean;
}

export interface PendingNotification {
  package_name: string;
  title: string;
  text: string;
  timestamp: number;
}

/**
 * Проверяет, имеет ли приложение доступ к уведомлениям (Android only)
 */
export async function checkNotificationPermission(): Promise<PermissionStatus> {
  // Only attempt to call Tauri APIs if actually running in Tauri
  if (!isTauri()) {
    return { granted: false };
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<PermissionStatus>("check_notification_permission");
  } catch (error) {
    console.error("Failed to check notification permission:", error);
    return { granted: false };
  }
}

/**
 * Открывает системные настройки для доступа к уведомлениям (Android only)
 */
export async function openNotificationSettings(): Promise<void> {
  // Only attempt to call Tauri APIs if actually running in Tauri
  if (!isTauri()) {
    throw new Error("Notification settings only available in Tauri environment");
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_notification_settings");
  } catch (error) {
    console.error("Failed to open notification settings:", error);
    throw error;
  }
}

/**
 * Получает список ожидающих уведомлений (Android only)
 */
export async function getPendingNotifications(): Promise<
  PendingNotification[]
> {
  // Only attempt to call Tauri APIs if actually running in Tauri
  if (!isTauri()) {
    return [];
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<PendingNotification[]>("get_pending_notifications");
  } catch (error) {
    console.error("Failed to get pending notifications:", error);
    return [];
  }
}

/**
 * Очищает список ожидающих уведомлений (Android only)
 */
export async function clearPendingNotifications(): Promise<void> {
  // Only attempt to call Tauri APIs if actually running in Tauri
  if (!isTauri()) {
    return;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("clear_pending_notifications");
  } catch (error) {
    console.error("Failed to clear pending notifications:", error);
    throw error;
  }
}

/**
 * Проверяет разрешение на отображение уведомлений приложения (POST_NOTIFICATIONS)
 * На Android 13+ требуется явное разрешение пользователя
 */
export async function checkAppNotificationPermission(): Promise<PermissionStatus> {
  // Only attempt to call Tauri APIs if actually running in Tauri
  if (!isTauri()) {
    return { granted: false };
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<PermissionStatus>("check_app_notification_permission");
  } catch (error) {
    console.error("Failed to check app notification permission:", error);
    return { granted: false };
  }
}

/**
 * Запрашивает разрешение на отображение уведомлений приложения (Android 13+ only)
 * Возвращает true если разрешение уже было предоставлено, false если был показан диалог запроса
 */
export async function requestAppNotificationPermission(): Promise<PermissionStatus> {
  // Only attempt to call Tauri APIs if actually running in Tauri
  if (!isTauri()) {
    return { granted: false };
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<PermissionStatus>(
      "request_app_notification_permission"
    );
  } catch (error) {
    console.error("Failed to request app notification permission:", error);
    return { granted: false };
  }
}

/**
 * Открывает системные настройки уведомлений приложения (Android only)
 */
export async function openAppNotificationSettings(): Promise<void> {
  // Only attempt to call Tauri APIs if actually running in Tauri
  if (!isTauri()) {
    throw new Error("App notification settings only available in Tauri environment");
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_app_notification_settings");
  } catch (error) {
    console.error("Failed to open app notification settings:", error);
    throw error;
  }
}

/**
 * Проверяет, отключена ли оптимизация батареи для приложения (Android only)
 * Отключение оптимизации батареи необходимо для стабильной работы службы прослушивания уведомлений
 */
export async function checkBatteryOptimizationDisabled(): Promise<boolean> {
  // Only attempt to call Tauri APIs if actually running in Tauri
  if (!isTauri()) {
    return false;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<boolean>("check_battery_optimization_disabled");
  } catch (error) {
    console.error("Failed to check battery optimization status:", error);
    return false;
  }
}

/**
 * Открывает системные настройки оптимизации батареи для приложения (Android only)
 */
export async function openBatteryOptimizationSettings(): Promise<void> {
  // Only attempt to call Tauri APIs if actually running in Tauri
  if (!isTauri()) {
    throw new Error("Battery optimization settings only available in Tauri environment");
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_battery_optimization_settings");
  } catch (error) {
    console.error("Failed to open battery optimization settings:", error);
    throw error;
  }
}
