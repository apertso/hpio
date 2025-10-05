import { invoke } from "@tauri-apps/api/core";

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
  try {
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
  try {
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
  try {
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
  try {
    await invoke("clear_pending_notifications");
  } catch (error) {
    console.error("Failed to clear pending notifications:", error);
    throw error;
  }
}
