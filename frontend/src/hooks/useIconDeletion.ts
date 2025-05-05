import { useState, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import { AxiosError } from "axios";
import logger from "../utils/logger";

interface UseIconDeletionProps {
  paymentId?: string;
  onError?: (message: string) => void;
  onIconChange: (iconInfo: null) => void; // Only null is expected
}

const useIconDeletion = ({
  paymentId,
  onError,
  onIconChange,
}: UseIconDeletionProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteIcon = useCallback(async () => {
    if (!paymentId) {
      console.warn("Cannot delete icon without paymentId");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Отправляем DELETE запрос на бэкенд для удаления пользовательской иконки
      await axiosInstance.delete(`/files/icon/${paymentId}`); // Эндпоинт DELETE /api/files/icon/:paymentId
      onIconChange(null); // Сбрасываем выбранную иконку на null (без иконки)
      logger.info(`Custom icon deleted for payment ${paymentId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
          ? error.message
          : "Не удалось удалить иконку.";
      logger.error(
        `Failed to delete icon for payment ${paymentId}:`,
        errorMessage,
        error
      );
      setDeleteError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, [paymentId, onIconChange, onError]);

  return { isDeleting, deleteError, handleDeleteIcon };
};

export default useIconDeletion;
