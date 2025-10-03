import { invoke } from "@tauri-apps/api/core";

export interface PermissionStatus {
  granted: boolean;
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
