import { useState, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import { AxiosError } from "axios";
import logger from "../utils/logger";

interface UseFileDeletionLogicProps {
  paymentId?: string;
  initialFile?: { filePath: string; fileName: string } | null;
  onFileDeleteSuccess?: () => void;
  onError?: (message: string) => void;
}

const useFileDeletionLogic = ({
  paymentId,
  initialFile,
  onFileDeleteSuccess,
  onError,
}: UseFileDeletionLogicProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteFile = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (!paymentId || !initialFile?.filePath) {
        return;
      }
      if (
        !window.confirm("Вы уверены, что хотите удалить прикрепленный файл?")
      ) {
        return;
      }

      setIsDeleting(true);
      setDeleteError(null);

      try {
        await axiosInstance.delete(`/files/payment/${paymentId}`);
        onFileDeleteSuccess?.();
        logger.info(`File deleted for payment ${paymentId}`);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof AxiosError && error.response?.data?.message
            ? error.response.data.message
            : error instanceof Error
            ? error.message
            : "Не удалось удалить файл.";
        logger.error(
          `Failed to delete file for payment ${paymentId}:`,
          errorMessage,
          error
        );
        setDeleteError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsDeleting(false);
      }
    },
    [paymentId, initialFile, onFileDeleteSuccess, onError]
  );

  return { isDeleting, deleteError, handleDeleteFile };
};

export default useFileDeletionLogic;
