import { useState, useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
import useApi from "./useApi"; // Import the new hook
import getErrorMessage from "../utils/getErrorMessage";
import { AxiosProgressEvent } from "axios";

interface UseFileUploadLogicProps {
  paymentId?: string;
  onFileUploadSuccess?: (fileInfo: {
    filePath: string;
    fileName: string;
  }) => void;
  onError?: (message: string) => void;
  isSubmitting?: boolean;
  onPendingFileSelected?: (file: File) => void;
}

interface UploadResponse {
  file: {
    filePath: string;
    fileName: string;
  };
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

const uploadFileApi = async (
  paymentId: string,
  formData: FormData,
  onUploadProgress: (progressEvent: AxiosProgressEvent) => void
): Promise<UploadResponse> => {
  const res = await axiosInstance.post(
    `/files/upload/payment/${paymentId}`,
    formData,
    {
      onUploadProgress,
    }
  );
  return res.data;
};

const useFileUploadLogic = ({
  paymentId,
  onFileUploadSuccess,
  onError,
  isSubmitting,
  onPendingFileSelected,
}: UseFileUploadLogicProps) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const {
    isLoading: isUploading,
    error: uploadError,
    execute: executeUpload,
  } = useApi<UploadResponse>(uploadFileApi, {
    onSuccess: (result) => {
      if (result?.file) {
        onFileUploadSuccess?.(result.file);
        logger.info("File uploaded successfully:", result.file);
      }
    },
    onError: (error) => {
      const msg = getErrorMessage(error);
      logger.error("File upload failed:", msg, error);
      onError?.(msg);
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // Если paymentId отсутствует, выбор файла допустим, но загрузку выполнит родитель после создания платежа.

      if (fileRejections.length > 0) {
        const code = fileRejections[0].errors[0]?.code;
        const msg =
          code === "file-too-large"
            ? `Размер файла превышает ${maxFileSize / 1024 / 1024} МБ.`
            : code === "file-invalid-type"
            ? "Недопустимый тип файла."
            : "Неверный файл.";
        onError?.(msg);
        return;
      }

      if (acceptedFiles.length === 0) return;

      if (!paymentId) {
        if (acceptedFiles[0]) {
          onPendingFileSelected?.(acceptedFiles[0]);
        }
        return;
      }

      setUploadProgress(0);
      const formData = new FormData();
      formData.append("paymentFile", acceptedFiles[0]);

      await executeUpload(paymentId, formData, (e: AxiosProgressEvent) => {
        const percent = Math.round((e.loaded * 100) / (e.total || 1));
        setUploadProgress(percent);
      });

      setUploadProgress(0);
    },
    [paymentId, executeUpload, onError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: allowedMimeTypes.reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {}
    ),
    maxSize: maxFileSize,
    disabled: isUploading || isSubmitting,
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
