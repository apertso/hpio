import { useState, useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import axiosInstance from "../api/axiosInstance";
import { AxiosError } from "axios";
import logger from "../utils/logger";

interface UseFileUploadLogicProps {
  paymentId?: string;
  onFileUploadSuccess?: (fileInfo: {
    filePath: string;
    fileName: string;
  }) => void;
  onError?: (message: string) => void;
  isSubmitting?: boolean;
}

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const maxFileSize = 5 * 1024 * 1024; // 5 МБ

const useFileUploadLogic = ({
  paymentId,
  onFileUploadSuccess,
  onError,
  isSubmitting,
}: UseFileUploadLogicProps) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setUploadError(null);

      if (!paymentId) {
        onError?.("Невозможно загрузить файл без ID платежа.");
        return;
      }

      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        const error = rejection.errors[0];
        let errorMessage = "Неверный файл.";
        if (error.code === "file-too-large") {
          errorMessage = `Размер файла превышает ${
            maxFileSize / 1024 / 1024
          } МБ.`;
        } else if (error.code === "file-invalid-type") {
          errorMessage = "Недопустимый тип файла.";
        }
        setUploadError(errorMessage);
        onError?.(errorMessage);
        return;
      }

      if (acceptedFiles.length === 0) {
        return;
      }

      const fileToUpload = acceptedFiles[0];

      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("paymentFile", fileToUpload);

      try {
        const res = await axiosInstance.post(
          `/files/upload/payment/${paymentId}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / (progressEvent.total || 1)
              );
              setUploadProgress(percentCompleted);
            },
          }
        );

        const uploadedFileInfo = res.data.file;
        onFileUploadSuccess?.(uploadedFileInfo);
        logger.info("File uploaded successfully:", uploadedFileInfo);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof AxiosError && error.response?.data?.message
            ? error.response.data.message
            : error instanceof Error
            ? error.message
            : "Не удалось загрузить файл.";
        logger.error("File upload failed:", errorMessage, error);
        setUploadError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [paymentId, onFileUploadSuccess, onError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: allowedMimeTypes.reduce(
      (acc: { [key: string]: string[] }, mime) => {
        acc[mime] = [];
        return acc;
      },
      {}
    ),
    maxSize: maxFileSize,
    disabled: isUploading || isSubmitting || !paymentId,
  });

  return {
    getRootProps,
    getInputProps,
    isDragActive,
    isUploading,
    uploadProgress,
    uploadError,
  };
};

export default useFileUploadLogic;
