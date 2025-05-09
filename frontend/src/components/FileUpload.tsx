// src/components/FileUpload.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  PaperClipIcon,
  XCircleIcon,
  DocumentIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import useFileUploadLogic from "../hooks/useFileUploadLogic";
import useFileDeletionLogic from "../hooks/useFileDeletionLogic";

const maxFileSize = 5 * 1024 * 1024; // 5 МБ

interface FileUploadProps {
  paymentId?: string;
  initialFile?: { filePath: string; fileName: string } | null;
  onFileUploadSuccess?: (fileInfo: {
    filePath: string;
    fileName: string;
  }) => void;
  onFileDeleteSuccess?: () => void;
  onError?: (message: string) => void;
  isSubmitting?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  paymentId,
  initialFile,
  onFileUploadSuccess,
  onFileDeleteSuccess,
  onError,
  isSubmitting,
}) => {
  const [file, setFile] = useState<{
    filePath: string;
    fileName: string;
  } | null>(initialFile || null);

  useEffect(() => {
    setFile(initialFile || null);
  }, [initialFile]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isUploading,
    uploadProgress,
    uploadError,
  } = useFileUploadLogic({
    paymentId,
    onFileUploadSuccess: (fileInfo) => {
      setFile(fileInfo);
      onFileUploadSuccess?.(fileInfo);
    },
    onError,
    isSubmitting,
  });

  const { isDeleting, deleteError, handleDeleteFile } = useFileDeletionLogic({
    paymentId,
    initialFile: file,
    onFileDeleteSuccess: () => {
      setFile(null);
      onFileDeleteSuccess?.();
    },
    onError,
  });

  // Хелпер для определения иконки файла по имени/типу
  const getFileIcon = useCallback((fileName: string) => {
    const parts = fileName.split(".");
    const ext = parts.length > 1 ? "." + parts.pop()?.toLowerCase() : "";

    if ([".jpg", ".jpeg", ".png", ".gif", ".bmp"].includes(ext)) {
      return <PhotoIcon className="h-6 w-6 text-blue-500" />;
    }
    if (ext === ".pdf") {
      return <DocumentIcon className="h-6 w-6 text-red-500" />;
    }
    if ([".doc", ".docx", ".xls", ".xlsx"].includes(ext)) {
      return <DocumentIcon className="h-6 w-6 text-green-500" />;
    }
    return <DocumentIcon className="h-6 w-6 text-gray-500" />;
  }, []);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
        Прикрепить файл
      </label>

      {/* Отображение прикрепленного файла, если он есть */}
      {file && !isUploading ? (
        <div className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
          {getFileIcon(file.fileName)}
          <span className="flex-1 truncate">{file.fileName}</span>
          <button
            onClick={handleDeleteFile}
            disabled={isDeleting || isSubmitting} // Отключаем кнопку, если удаляется или форма отправляется
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 disabled:opacity-50"
            title={isDeleting ? "Удаление..." : "Удалить файл"}
          >
            {isDeleting ? (
              // TODO: Добавить спиннер
              <span>...</span>
            ) : (
              <XCircleIcon className="h-5 w-5" /> // Иконка удаления
            )}
          </button>
        </div>
      ) : (
        // Drag-and-drop область, если файла нет или идет загрузка
        <div
          {...getRootProps()} // Привязываем события dropzone к div
          className={`border-2 border-dashed p-6 rounded-md text-center cursor-pointer transition-colors duration-200
                          ${
                            isDragActive
                              ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                              : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                          }
                          ${
                            isUploading ||
                            isDeleting ||
                            isSubmitting ||
                            !paymentId
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`} // Отключаем, если идет загрузка/удаление, форма отправляется или нет paymentId
          aria-disabled={
            isUploading || isDeleting || isSubmitting || !paymentId
          } // Добавляем для доступности
        >
          <input
            {...getInputProps()}
            disabled={isUploading || isDeleting || isSubmitting || !paymentId}
          />{" "}
          {/* Скрытый input */}
          {isUploading ? (
            // Индикатор загрузки
            <div>
              <PaperClipIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300" />
              <p className="mt-2 text-sm text-gray-900 dark:text-gray-100">
                Загрузка файла...
              </p>
              {/* TODO: Реализовать визуальный прогресс-бар */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-600 mt-2">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {uploadProgress}%
              </p>
            </div>
          ) : (
            // Текст в области dropzone
            <div>
              <PaperClipIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300" />
              <p className="mt-2 text-sm text-gray-900 dark:text-gray-100">
                {isDragActive
                  ? "Перетащите файл сюда..."
                  : "Перетащите файл сюда или кликните для выбора"}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {`Разрешены: JPG, PNG, PDF, DOC(X), XLS(X) (до ${
                  maxFileSize / 1024 / 1024
                }МБ)`}
              </p>
              {!paymentId && ( // Если нет paymentId, объясняем почему нельзя загрузить
                <p className="mt-2 text-sm font-semibold text-red-500 dark:text-red-400">
                  Сначала сохраните платеж, чтобы прикрепить файл.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Отображение ошибок загрузки или удаления */}
      {uploadError && (
        <p className="mt-1 text-sm text-red-600">{uploadError.message}</p>
      )}
      {deleteError && (
        <p className="mt-1 text-sm text-red-600">{deleteError.message}</p>
      )}
    </div>
  );
};

export default FileUpload;
