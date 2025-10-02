// backend/src/services/storage/StorageStrategy.ts

export interface UploadResult {
  path: string; // Относительный путь к файлу
  url?: string; // Опционально: публичный URL (для CDN)
}

export interface DownloadResult {
  data: Buffer;
  mimeType?: string;
}

export interface StorageStrategy {
  /**
   * Загружает файл в хранилище
   * @param filePath - Относительный путь к файлу
   * @param fileBuffer - Буфер с содержимым файла
   * @param mimeType - MIME-тип файла
   * @returns Результат загрузки с путем и опциональным URL
   */
  upload(
    filePath: string,
    fileBuffer: Buffer,
    mimeType?: string
  ): Promise<UploadResult>;

  /**
   * Загружает файл из хранилища
   * @param filePath - Относительный путь к файлу
   * @returns Буфер с содержимым файла
   */
  download(filePath: string): Promise<DownloadResult>;

  /**
   * Удаляет файл из хранилища
   * @param filePath - Относительный путь к файлу
   */
  delete(filePath: string): Promise<void>;

  /**
   * Проверяет существование файла в хранилище
   * @param filePath - Относительный путь к файлу
   * @returns true если файл существует
   */
  exists(filePath: string): Promise<boolean>;
}
