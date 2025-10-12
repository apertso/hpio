import { invoke } from "@tauri-apps/api/core";
import axiosInstance from "./axiosInstance";

export interface FcmTokenResponse {
  success: boolean;
  message?: string;
}

/**
 * Gets the FCM token from the device (Android only)
 */
export async function getFcmToken(): Promise<string | null> {
  try {
    return await invoke<string | null>("get_fcm_token");
  } catch (error) {
    console.error("Failed to get FCM token:", error);
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
    console.error("Failed to register FCM token:", error);
    throw error;
  }
}

/**
 * Gets pending navigation action from notification click
 */
export async function getPendingNavigation(): Promise<string | null> {
  try {
    return await invoke<string | null>("get_pending_navigation");
  } catch (error) {
    console.error("Failed to get pending navigation:", error);
    return null;
  }
}

/**
 * Clears pending navigation action
 */
export async function clearPendingNavigation(): Promise<void> {
  try {
    await invoke("clear_pending_navigation");
  } catch (error) {
    console.error("Failed to clear pending navigation:", error);
  }
}
