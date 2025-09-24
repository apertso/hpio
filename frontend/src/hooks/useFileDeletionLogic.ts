import { useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import useApi from "./useApi"; // Import the new hook
import logger from "../utils/logger";
import getErrorMessage from "../utils/getErrorMessage";

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
  const {
    isLoading: isDeleting,
    error: deleteError,
    execute: executeDelete,
  } = useApi<void>(
    (paymentId: string) => axiosInstance.delete(`/files/payment/${paymentId}`),
    {
      onSuccess: () => {
        onFileDeleteSuccess?.();
        logger.info(`File deleted for payment ${paymentId}`);
      },
      onError: (error) => {
        const message = getErrorMessage(error);
        logger.error(
          `Failed to delete file for payment ${paymentId}:`,
          message,
          error
        );
        onError?.(message);
      },
    }
  );

  const handleDeleteFile = useCallback(
    async (event?: React.MouseEvent<HTMLButtonElement>) => {
      event?.preventDefault();
      if (!paymentId || !initialFile?.filePath) return;
      if (!window.confirm("Вы уверены, что хотите удалить прикрепленный файл?"))
        return;
      await executeDelete(paymentId);
    },
    [paymentId, initialFile, executeDelete]
  );

  return { isDeleting, deleteError, handleDeleteFile };
};

export default useFileDeletionLogic;
