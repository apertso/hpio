// src/utils/fileLogger.ts
import {
  BaseDirectory,
  exists,
  writeTextFile,
  readTextFile,
} from "@tauri-apps/plugin-fs";
import { isTauri, isTauriMobile } from "./platform";

const LOG_FILE_NAME = "logs.txt";

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
    return; // Only log on Tauri Android
  }

  try {
    const isFromToday = await isLogFileFromToday();
    const timestamp = getTimestamp();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;

    if (!isFromToday) {
      // Create new log file for today
      const header = `=== Log Date: ${getCurrentDateString()} ===\n`;
      await writeTextFile(LOG_FILE_NAME, header + logEntry, {
        baseDir: BaseDirectory.AppData,
      });
    } else {
      // Append to existing log
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
