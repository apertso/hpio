// src/utils/platform.ts
import { platform } from "@tauri-apps/plugin-os";

/**
 * Detects if the app is running in a Tauri environment
 */
export const isTauri = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

/**
 * Detects if the app is running on Android within Tauri
 */
export const isTauriMobile = (): boolean => {
  // Check for development override
  if (typeof window !== "undefined") {
    const override = localStorage.getItem("dev_mobile_override");
    if (override === "on") return true;
    if (override === "off") return false;
  }

  if (!isTauri()) return false;

  const currentPlatform = platform();
  return currentPlatform === "android";
};
