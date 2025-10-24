import imageCompression from "browser-image-compression";

/**
 * Сжимает изображение профиля до WebP формата
 * @param file - Исходный файл изображения
 * @returns Promise с сжатым файлом в формате WebP
 */
export async function compressProfileImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 512,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.75,
  };

  try {
    const compressedFile = await imageCompression(file, options);

    // Создаём новый файл с правильным именем (с расширением .webp)
    const fileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    const webpFile = new File([compressedFile], fileName, {
      type: "image/webp",
    });

    // Логируем результаты сжатия
    const originalSizeKB = (file.size / 1024).toFixed(2);
    const compressedSizeKB = (webpFile.size / 1024).toFixed(2);
    const compressionRatio = (
      ((file.size - webpFile.size) / file.size) *
      100
    ).toFixed(1);

    console.log(
      `Image compression: ${originalSizeKB}KB → ${compressedSizeKB}KB (${compressionRatio}% reduction)`
    );

    return webpFile;
  } catch (error) {
    console.error("Image compression failed:", error);
    throw new Error("Не удалось сжать изображение");
  }
}

