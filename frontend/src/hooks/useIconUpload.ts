import { useState, useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import axiosInstance from "../api/axiosInstance";
import { AxiosError } from "axios";
import logger from "../utils/logger";
import { BuiltinIcon } from "../utils/builtinIcons";

interface PaymentIconInfo {
  iconType: "builtin" | "custom" | null;
  builtinIconName?: BuiltinIcon | null;
  iconPath?: string | null;
}

interface UseIconUploadProps {
  paymentId?: string;
  onError?: (message: string) => void;
  isFormSubmitting?: boolean;
  onIconChange: (iconInfo: PaymentIconInfo | null) => void;
}

// TODO: Определить разрешенные типы и размер для иконок (должны совпадать с бэкендом)
const allowedMimeTypesIcons = ["image/svg+xml"];
const maxFileSizeIcon = 0.5 * 1024 * 1024; // 0.5 МБ

const useIconUpload = ({
  paymentId,
  onError,
  isFormSubmitting,
  onIconChange,
}: UseIconUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setUploadError(null); // Сбросить ошибки загрузки

      if (!paymentId) {
        onError?.("Невозможно загрузить иконку без ID платежа.");
        return;
      }

      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        const error = rejection.errors[0];
        let errorMessage = "Неверный файл иконки.";
        if (error.code === "file-too-large") {
          errorMessage = `Размер иконки превышает ${
            maxFileSizeIcon / 1024
          } КБ.`;
        } else if (error.code === "file-invalid-type") {
          errorMessage = "Недопустимый тип иконки. Разрешен только SVG.";
        }
        setUploadError(errorMessage);
        onError?.(errorMessage);
        return;
      }

      if (acceptedFiles.length === 0) {
        return;
      }

      const iconToUpload = acceptedFiles[0];

      setIsUploading(true);

      const formData = new FormData();
      formData.append("paymentIcon", iconToUpload); // 'paymentIcon' - имя поля, как в Multer на бэкенде

      try {
        // Отправляем иконку на бэкенд
        const res = await axiosInstance.post(
          `/files/upload/icon/${paymentId}`,
          formData,
          {
            // Эндпоинт из Части 13
            headers: { "Content-Type": "multipart/form-data" },
            // TODO: onUploadProgress для прогресса загрузки иконки (если нужно)
          }
        );

        const uploadedIconInfo = res.data.icon; // Ожидаем { iconPath, iconType } из ответа бэкенда
        onIconChange(uploadedIconInfo); // Устанавливаем новую пользовательскую иконку
        logger.info("Custom icon uploaded successfully:", uploadedIconInfo);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof AxiosError && error.response?.data?.message
            ? error.response.data.message
            : error instanceof Error
            ? error.message
            : "Не удалось загрузить иконку.";
        logger.error("Custom icon upload failed:", errorMessage, error);
        setUploadError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsUploading(false);
      }
    },
    [paymentId, onIconChange, onError]
  );

  // Настройка dropzone для иконок
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: allowedMimeTypesIcons.reduce(
      (acc: { [key: string]: string[] }, mime) => {
        acc[mime] = [];
        return acc;
      },
      {}
    ),
    maxSize: maxFileSizeIcon,
    disabled: isUploading || !paymentId || isFormSubmitting, // Отключаем, если идет загрузка, нет paymentId, или форма отправляется
  });

  return {
    getRootProps,
    getInputProps,
    isDragActive,
    isUploading,
    uploadError,
  };
};

export default useIconUpload;
