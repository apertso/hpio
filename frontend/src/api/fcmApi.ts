import axiosInstance from "./axiosInstance";
import { isTauri } from "../utils/platform";
import logger from "../utils/logger";

export interface FcmTokenResponse {
  success: boolean;
  message?: string;
}

/**
 * Gets the FCM token from the device (Android only)
 */
export async function getFcmToken(): Promise<string | null> {
  // Only attempt to call Tauri APIs if actually running in Tauri
  if (!isTauri()) {
    return null;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string | null>("get_fcm_token");
  } catch (error) {
    logger.error("Failed to get FCM token:", error);
    return null;
  }
}

/**
 * Registers or updates the FCM token on the backend
 */
export async function registerFcmToken(
  token: string
): Promise<FcmTokenResponse> {
  try {
    const response = await axiosInstance.post("/user/fcm-token", { token });
    return response.data;
  } catch (error) {
    logger.error("Failed to register FCM token:", error);
    throw error;
  }
}

/**
 * Gets pending navigation action from notification click
 */
export async function getPendingNavigation(): Promise<string | null> {
  // Only attempt to call Tauri APIs if actually running in Tauri
  if (!isTauri()) {
    return null;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string | null>("get_pending_navigation");
  } catch (error) {
    logger.error("Failed to get pending navigation:", error);
    return null;
  }
}

/**
 * Clears pending navigation action
 */
export async function clearPendingNavigation(): Promise<void> {
  // Only attempt to call Tauri APIs if actually running in Tauri
  if (!isTauri()) {
    return;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("clear_pending_navigation");
  } catch (error) {
    logger.error("Failed to clear pending navigation:", error);
  }
}
