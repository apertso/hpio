// src/utils/platform.ts

/**
 * Detects if the app is running in a Tauri environment
 */
export const isTauri = (): boolean => {
  return typeof window !== "undefined" && "__TAURI__" in window;
};

/**
 * Detects if the app is running on a mobile platform within Tauri
 */
export const isTauriMobile = (): boolean => {
  if (!isTauri()) return false;

  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes("android") ||
    userAgent.includes("iphone") ||
    userAgent.includes("ipad")
  );
};
