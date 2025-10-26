// src/utils/fileLogger.ts
import {
  BaseDirectory,
  exists,
  writeTextFile,
  readTextFile,
} from "@tauri-apps/plugin-fs";
import { isTauri, isTauriMobile } from "./platform";

const LOG_FILE_NAME = "logs.txt";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";
export type ErrorType =
  | "JS_ERROR"
  | "JS_UNHANDLED_PROMISE"
  | "RUST_PANIC"
  | "KOTLIN_EXCEPTION"
  | "ANR"
  | "UI_FREEZE"
  | "BREADCRUMB";

interface DeviceInfo {
  userAgent?: string;
  platform?: string;
  language?: string;
  screenResolution?: string;
  appVersion?: string;
}

let cachedDeviceInfo: DeviceInfo | null = null;

function getDeviceInfo(): DeviceInfo {
  if (cachedDeviceInfo) return cachedDeviceInfo;

  cachedDeviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    appVersion: import.meta.env.VITE_APP_VERSION || "unknown",
  };

  return cachedDeviceInfo;
}

/**
 * Gets the current date in YYYY-MM-DD format
 */
function getCurrentDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Gets a formatted timestamp for log entries
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Checks if the log file is from today
 */
async function isLogFileFromToday(): Promise<boolean> {
  try {
    if (!(await exists(LOG_FILE_NAME, { baseDir: BaseDirectory.AppData }))) {
      return false;
    }

    const content = await readTextFile(LOG_FILE_NAME, {
      baseDir: BaseDirectory.AppData,
    });
    if (!content) return false;

    // Check first line for date marker
    const firstLine = content.split("\n")[0];

    return firstLine.includes(getCurrentDateString());
  } catch (error) {
    console.error("Error checking log file date:", error);
    return false;
  }
}

/**
 * Writes a log entry to the file
 */
async function writeToLogFile(level: string, message: string): Promise<void> {
  if (!isTauri() || !isTauriMobile()) {
    return;
  }

  try {
    const isFromToday = await isLogFileFromToday();
    const timestamp = getTimestamp();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;

    if (!isFromToday) {
      const deviceInfo = getDeviceInfo();
      const header = `=== Log Date: ${getCurrentDateString()} ===\n=== Device: ${
        deviceInfo.platform
      } | UA: ${deviceInfo.userAgent} | Version: ${
        deviceInfo.appVersion
      } ===\n`;
      await writeTextFile(LOG_FILE_NAME, header + logEntry, {
        baseDir: BaseDirectory.AppData,
      });
    } else {
      const existingContent = await readTextFile(LOG_FILE_NAME, {
        baseDir: BaseDirectory.AppData,
      });
      await writeTextFile(LOG_FILE_NAME, existingContent + logEntry, {
        baseDir: BaseDirectory.AppData,
      });
    }
  } catch (error) {
    console.error("Error writing to log file:", error);
  }
}

/**
 * Logs structured error with additional metadata
 */
async function logStructuredError(
  errorType: ErrorType,
  error: Error | string,
  additionalData?: Record<string, any>
): Promise<void> {
  if (!isTauri() || !isTauriMobile()) {
    return;
  }

  try {
    const timestamp = getTimestamp();
    const deviceInfo = getDeviceInfo();

    const errorMessage = error instanceof Error ? error.message : error;
    const stackTrace = error instanceof Error ? error.stack : undefined;

    const structuredLog = {
      timestamp,
      type: errorType,
      message: errorMessage,
      stack: stackTrace,
      device: deviceInfo,
      route: window.location.pathname,
      ...additionalData,
    };

    const logEntry = `[${timestamp}] [ERROR] [${errorType}] ${JSON.stringify(
      structuredLog
    )}\n`;

    const isFromToday = await isLogFileFromToday();
    if (!isFromToday) {
      const header = `=== Log Date: ${getCurrentDateString()} ===\n=== Device: ${
        deviceInfo.platform
      } | UA: ${deviceInfo.userAgent} | Version: ${
        deviceInfo.appVersion
      } ===\n`;
      await writeTextFile(LOG_FILE_NAME, header + logEntry, {
        baseDir: BaseDirectory.AppData,
      });
    } else {
      const existingContent = await readTextFile(LOG_FILE_NAME, {
        baseDir: BaseDirectory.AppData,
      });
      await writeTextFile(LOG_FILE_NAME, existingContent + logEntry, {
        baseDir: BaseDirectory.AppData,
      });
    }
  } catch (err) {
    console.error("Error writing structured error to log file:", err);
  }
}

/**
 * File logger with the same interface as console logger
 */
export const fileLogger = {
  info: async (...args: any[]) => {
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      )
      .join(" ");
    await writeToLogFile("INFO", message);
  },
  warn: async (...args: any[]) => {
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      )
      .join(" ");
    await writeToLogFile("WARN", message);
  },
  error: async (...args: any[]) => {
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      )
      .join(" ");
    await writeToLogFile("ERROR", message);
  },
  debug: async (...args: any[]) => {
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      )
      .join(" ");
    await writeToLogFile("DEBUG", message);
  },
};

/**
 * Gets the log file path for download/sharing
 */
export async function getLogFilePath(): Promise<string | null> {
  if (!isTauri() || !isTauriMobile()) {
    return null;
  }

  try {
    if (await exists(LOG_FILE_NAME, { baseDir: BaseDirectory.AppData })) {
      // Return the file name - Tauri will handle the full path
      return LOG_FILE_NAME;
    }
    return null;
  } catch (error) {
    console.error("Error getting log file path:", error);
    return null;
  }
}

/**
 * Reads the current log file content
 */
export async function readLogFile(): Promise<string | null> {
  if (!isTauri() || !isTauriMobile()) {
    return null;
  }

  try {
    if (await exists(LOG_FILE_NAME, { baseDir: BaseDirectory.AppData })) {
      return await readTextFile(LOG_FILE_NAME, {
        baseDir: BaseDirectory.AppData,
      });
    }
    return null;
  } catch (error) {
    console.error("Error reading log file:", error);
    return null;
  }
}

/**
 * Logs a breadcrumb (user action)
 */
export async function logBreadcrumb(
  action: string,
  details?: Record<string, any>
): Promise<void> {
  if (!isTauri() || !isTauriMobile()) {
    return;
  }

  try {
    const timestamp = getTimestamp();
    const breadcrumbData = {
      action,
      route: window.location.pathname,
      ...details,
    };

    const logEntry = `[${timestamp}] [BREADCRUMB] ${JSON.stringify(
      breadcrumbData
    )}\n`;

    const isFromToday = await isLogFileFromToday();
    if (!isFromToday) {
      const deviceInfo = getDeviceInfo();
      const header = `=== Log Date: ${getCurrentDateString()} ===\n=== Device: ${
        deviceInfo.platform
      } | UA: ${deviceInfo.userAgent} | Version: ${
        deviceInfo.appVersion
      } ===\n`;
      await writeTextFile(LOG_FILE_NAME, header + logEntry, {
        baseDir: BaseDirectory.AppData,
      });
    } else {
      const existingContent = await readTextFile(LOG_FILE_NAME, {
        baseDir: BaseDirectory.AppData,
      });
      await writeTextFile(LOG_FILE_NAME, existingContent + logEntry, {
        baseDir: BaseDirectory.AppData,
      });
    }
  } catch (error) {
    console.error("Error writing breadcrumb to log file:", error);
  }
}

export { logStructuredError };
