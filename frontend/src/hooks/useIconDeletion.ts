import { useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
import useApi from "./useApi"; // Import the new hook
import getErrorMessage from "../utils/getErrorMessage";

interface UseIconDeletionProps {
  paymentId?: string;
  onError?: (message: string) => void;
  onIconChange: (iconInfo: null) => void; // Only null is expected
}

const deleteIconApi = async (paymentId: string) => {
  await axiosInstance.delete(`/files/icon/${paymentId}`); // Эндпоинт DELETE /api/files/icon/:paymentId
};

const useIconDeletion = ({
  paymentId,
  onError,
  onIconChange,
}: UseIconDeletionProps) => {
  const {
    isLoading: isDeleting,
    error: deleteError,
    execute: executeDeleteIcon,
  } = useApi<void>(deleteIconApi, {
    onSuccess: () => {
      onIconChange(null);
      logger.info(`Custom icon deleted for payment ${paymentId}`);
    },
    onError: (error) => {
      const msg = getErrorMessage(error);
      logger.error(
        `Failed to delete icon for payment ${paymentId}:`,
        msg,
        error
      );
      onError?.(msg);
    },
  });

  const handleDeleteIcon = useCallback(() => {
    if (!paymentId) {
      console.warn("Cannot delete icon without paymentId");
      return;
    }
    executeDeleteIcon(paymentId);
  }, [paymentId, executeDeleteIcon]);

  return { isDeleting, deleteError, handleDeleteIcon };
};

export default useIconDeletion;
