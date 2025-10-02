// backend/src/services/storage/StorageFactory.ts
import { StorageStrategy } from "./StorageStrategy";
import { LocalStorageStrategy } from "./LocalStorageStrategy";
import { BunnyStorageStrategy } from "./BunnyStorageStrategy";
import { config } from "../../config/appConfig";
import logger from "../../config/logger";

export class StorageFactory {
  private static instance: StorageStrategy | null = null;

  static getStorage(): StorageStrategy {
    if (this.instance) {
      return this.instance;
    }

    const storageType = config.storage.type;

    switch (storageType) {
      case "bunny":
        logger.info("Initializing Bunny.net storage strategy");

        if (!config.storage.bunny.apiKey || !config.storage.bunny.storageZone) {
          throw new Error(
            "Bunny.net storage configuration is incomplete. Please check BUNNY_STORAGE_API_KEY and BUNNY_STORAGE_ZONE."
          );
        }

        this.instance = new BunnyStorageStrategy({
          apiKey: config.storage.bunny.apiKey,
          storageZone: config.storage.bunny.storageZone,
          region: config.storage.bunny.region,
          cdnHostname: config.storage.bunny.cdnHostname,
        });
        break;

      case "local":
      default:
        logger.info("Initializing local storage strategy");
        this.instance = new LocalStorageStrategy(config.uploadDir);
        break;
    }

    return this.instance;
  }

  static resetInstance(): void {
    this.instance = null;
  }
}
