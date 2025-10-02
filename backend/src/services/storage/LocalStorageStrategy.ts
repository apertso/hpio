// backend/src/services/storage/LocalStorageStrategy.ts
import fs from "fs/promises";
import path from "path";
import {
  StorageStrategy,
  UploadResult,
  DownloadResult,
} from "./StorageStrategy";
import logger from "../../config/logger";

export class LocalStorageStrategy implements StorageStrategy {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async upload(
    filePath: string,
    fileBuffer: Buffer,
    mimeType?: string
  ): Promise<UploadResult> {
    const fullPath = path.join(this.baseDir, filePath);
    const directory = path.dirname(fullPath);

    try {
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(fullPath, fileBuffer);

      logger.info(`File uploaded to local storage: ${filePath}`);

      return { path: filePath };
    } catch (error: any) {
      logger.error(`Error uploading file to local storage: ${filePath}`, error);
      throw new Error(`Не удалось загрузить файл: ${error.message}`);
    }
  }

  async download(filePath: string): Promise<DownloadResult> {
    const fullPath = path.join(this.baseDir, filePath);

    try {
      const data = await fs.readFile(fullPath);
      logger.info(`File downloaded from local storage: ${filePath}`);

      return { data };
    } catch (error: any) {
      if (error.code === "ENOENT") {
        logger.warn(`File not found in local storage: ${filePath}`);
        throw new Error("Файл не найден.");
      }
      logger.error(
        `Error downloading file from local storage: ${filePath}`,
        error
      );
      throw new Error(`Не удалось загрузить файл: ${error.message}`);
    }
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, filePath);

    try {
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
        logger.info(`Directory deleted from local storage: ${filePath}`);
      } else {
        await fs.unlink(fullPath);
        logger.info(`File deleted from local storage: ${filePath}`);
      }
    } catch (error: any) {
      if (error.code === "ENOENT") {
        logger.warn(`File/directory not found for deletion: ${filePath}`);
        return;
      }
      logger.error(
        `Error deleting file from local storage: ${filePath}`,
        error
      );
      throw new Error(`Не удалось удалить файл: ${error.message}`);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, filePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
