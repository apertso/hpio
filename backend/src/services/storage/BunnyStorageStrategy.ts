// backend/src/services/storage/BunnyStorageStrategy.ts
import axios, { AxiosInstance } from "axios";
import {
  StorageStrategy,
  UploadResult,
  DownloadResult,
} from "./StorageStrategy";
import logger from "../../config/logger";

export interface BunnyConfig {
  apiKey: string;
  storageZone: string;
  region?: string; // de, ny, la, sg, etc.
  cdnHostname?: string;
}

export class BunnyStorageStrategy implements StorageStrategy {
  private client: AxiosInstance;
  private config: BunnyConfig;
  private baseUrl: string;
  private readonly uploadsPrefix = "uploads";

  constructor(config: BunnyConfig) {
    this.config = config;

    // Bunny.net Storage API endpoints по регионам
    const regionEndpoints: Record<string, string> = {
      de: "storage.bunnycdn.com",
      ny: "ny.storage.bunnycdn.com",
      la: "la.storage.bunnycdn.com",
      sg: "sg.storage.bunnycdn.com",
      se: "se.storage.bunnycdn.com",
      uk: "uk.storage.bunnycdn.com",
    };

    const endpoint = config.region
      ? regionEndpoints[config.region] || "storage.bunnycdn.com"
      : "storage.bunnycdn.com";

    this.baseUrl = `https://${endpoint}/${config.storageZone}`;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        AccessKey: config.apiKey,
      },
      timeout: 30000,
    });
  }

  private getFullPath(filePath: string): string {
    return `${this.uploadsPrefix}/${filePath}`;
  }

  async upload(
    filePath: string,
    fileBuffer: Buffer,
    mimeType?: string
  ): Promise<UploadResult> {
    const fullPath = this.getFullPath(filePath);
    const url = `/${fullPath}`;

    try {
      await this.client.put(url, fileBuffer, {
        headers: {
          "Content-Type": mimeType || "application/octet-stream",
        },
      });

      logger.info(`File uploaded to Bunny.net: ${fullPath}`);

      const cdnUrl = this.config.cdnHostname
        ? `https://${this.config.cdnHostname}/${fullPath}`
        : undefined;

      return { path: filePath, url: cdnUrl };
    } catch (error: any) {
      logger.error(`Error uploading file to Bunny.net: ${fullPath}`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Не удалось загрузить файл на CDN: ${error.message}`);
    }
  }

  async download(filePath: string): Promise<DownloadResult> {
    const fullPath = this.getFullPath(filePath);
    const url = `/${fullPath}`;

    try {
      const response = await this.client.get(url, {
        responseType: "arraybuffer",
      });

      logger.info(`File downloaded from Bunny.net: ${fullPath}`);

      const mimeType = response.headers["content-type"];

      return {
        data: Buffer.from(response.data),
        mimeType,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.warn(`File not found in Bunny.net: ${fullPath}`);
        throw new Error("Файл не найден.");
      }
      logger.error(`Error downloading file from Bunny.net: ${fullPath}`, {
        message: error.message,
        status: error.response?.status,
      });
      throw new Error(`Не удалось загрузить файл с CDN: ${error.message}`);
    }
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    const url = `/${fullPath}`;

    try {
      await this.client.delete(url);
      logger.info(`File deleted from Bunny.net: ${fullPath}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.warn(`File not found for deletion in Bunny.net: ${fullPath}`);
        return;
      }
      logger.error(`Error deleting file from Bunny.net: ${fullPath}`, {
        message: error.message,
        status: error.response?.status,
      });
      throw new Error(`Не удалось удалить файл с CDN: ${error.message}`);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(filePath);
    const url = `/${fullPath}`;

    try {
      // Используем GET с Range header вместо HEAD, т.к. Bunny.net HEAD может возвращать 401
      await this.client.get(url, {
        headers: {
          Range: "bytes=0-0",
        },
        validateStatus: (status) => status === 206 || status === 200,
      });
      return true;
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 416) {
        return false;
      }
      logger.error(`Error checking file existence in Bunny.net: ${fullPath}`, {
        message: error.message,
        status: error.response?.status,
      });
      return false;
    }
  }
}
