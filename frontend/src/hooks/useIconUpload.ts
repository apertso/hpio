import { useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
import { BuiltinIcon } from "../utils/builtinIcons";
import useApi from "./useApi";
import getErrorMessage from "../utils/getErrorMessage";

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

interface UploadIconResponse {
  icon: PaymentIconInfo;
}

// TODO: Определить разрешенные типы и размер для иконок (должны совпадать с бэкендом)
const allowedMimeTypesIcons = ["image/svg+xml"];
const maxFileSizeIcon = 0.5 * 1024 * 1024; // 0.5 МБ

const uploadIconApi = async (
  paymentId: string,
  formData: FormData
): Promise<UploadIconResponse> => {
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
  return res.data;
};

const useIconUpload = ({
  paymentId,
  onError,
  isFormSubmitting,
  onIconChange,
}: UseIconUploadProps) => {
  const {
    isLoading: isUploading,
    error: uploadError,
    execute: executeUploadIcon,
  } = useApi<UploadIconResponse>(uploadIconApi, {
    onSuccess: (res) => {
      onIconChange(res.icon);
      logger.info("Custom icon uploaded successfully:", res.icon);
    },
    onError: (error) => {
      const msg = getErrorMessage(error);
      logger.error("Custom icon upload failed:", msg, error);
      onError?.(msg);
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (!paymentId) {
        onError?.("Невозможно загрузить иконку без ID платежа.");
        return;
      }

      if (fileRejections.length > 0) {
        const errorCode = fileRejections[0].errors[0].code;
        const message =
          errorCode === "file-too-large"
            ? `Размер иконки превышает ${maxFileSizeIcon / 1024} КБ.`
            : errorCode === "file-invalid-type"
            ? "Недопустимый тип иконки. Разрешен только SVG."
            : "Неверный файл иконки.";
        onError?.(message);
        return;
      }

      if (acceptedFiles.length === 0) return;

      const formData = new FormData();
      formData.append("paymentIcon", acceptedFiles[0]);
      executeUploadIcon(paymentId, formData);
    },
    [paymentId, executeUploadIcon, onError]
  );

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
    disabled: isUploading || !paymentId || isFormSubmitting,
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
