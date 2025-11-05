// src/utils/logger.ts
import { fileLogger } from "./fileLogger";

const logger = {
  info: (...args: unknown[]) => {
    console.log("[INFO]", ...args);
    fileLogger.info(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn("[WARN]", ...args);
    fileLogger.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error("[ERROR]", ...args);
    fileLogger.error(...args);
  },
  debug: (...args: unknown[]) => {
    console.debug("[DEBUG]", ...args);
    fileLogger.debug(...args);
  },
};

export default logger;
