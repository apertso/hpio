// src/utils/logger.ts
import { fileLogger } from "./fileLogger";

const logger = {
  info: (...args: any[]) => {
    console.log("[INFO]", ...args);
    fileLogger.info(...args);
  },
  warn: (...args: any[]) => {
    console.warn("[WARN]", ...args);
    fileLogger.warn(...args);
  },
  error: (...args: any[]) => {
    console.error("[ERROR]", ...args);
    fileLogger.error(...args);
  },
  debug: (...args: any[]) => {
    console.debug("[DEBUG]", ...args);
    fileLogger.debug(...args);
  },
};

export default logger;
