// src/components/FileUpload.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  PaperClipIcon,
  XCircleIcon,
  DocumentIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import useFileUploadLogic from "../hooks/useFileUploadLogic";
import useFileDeletionLogic from "../hooks/useFileDeletionLogic";
import Spinner from "./Spinner";
import { Input } from "./Input";

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
  onPendingFileChange?: (file: File | null) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  paymentId,
  initialFile,
  onFileUploadSuccess,
  onFileDeleteSuccess,
  onError,
  isSubmitting,
  onPendingFileChange,
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
    onPendingFileSelected: (f) => {
      setFile({ filePath: "", fileName: f.name });
      onPendingFileChange?.(f);
    },
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

  const getFileIcon = useCallback((fileName: string) => {
    const parts = fileName.split(".");
    const ext = parts.length > 1 ? "." + parts.pop()?.toLowerCase() : "";

    if ([".jpg", ".jpeg", ".png", ".gif", ".bmp"].includes(ext)) {
      return <PhotoIcon className="h-5 w-5 text-indigo-500" />;
    }
    if (ext === ".pdf") {
      return <DocumentIcon className="h-5 w-5 text-red-500" />;
    }
    if ([".doc", ".docx", ".xls", ".xlsx"].includes(ext)) {
      return <DocumentIcon className="h-5 w-5 text-blue-500" />;
    }
    return <DocumentIcon className="h-5 w-5 text-gray-400" />;
  }, []);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
        Прикрепить файл
      </label>

      {/* File Preview Card */}
      {file && !isUploading ? (
        <div className="group relative flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600">
              {getFileIcon(file.fileName)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {file.fileName}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {!paymentId && "Ожидает загрузки"}
                {paymentId && "Файл загружен"}
              </span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              if (!paymentId) {
                setFile(null);
                onPendingFileChange?.(null);
                onFileDeleteSuccess?.();
                return;
              }
              handleDeleteFile();
            }}
            disabled={isDeleting || isSubmitting}
            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title={isDeleting ? "Удаление..." : "Удалить файл"}
          >
            {isDeleting ? (
              <Spinner size="sm" />
            ) : (
              <XCircleIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      ) : (
        // Dropzone / Mobile Button
        <div
          {...getRootProps()}
          className={`relative transition-all duration-200 cursor-pointer
            ${
              isUploading || isDeleting || isSubmitting
                ? "opacity-50 cursor-not-allowed"
                : ""
            }
            ${
              isDragActive
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                : "hover:bg-gray-50 dark:hover:bg-gray-800"
            }
          `}
          aria-disabled={isUploading || isDeleting || isSubmitting}
        >
          <Input
            {...getInputProps()}
            disabled={isUploading || isDeleting || isSubmitting}
            className="sr-only"
            unstyled
          />

          {isUploading ? (
            // Loading State
            <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
              <div className="flex flex-col items-center justify-center py-2">
                <Spinner />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  Загрузка файла...
                </p>
                <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 mt-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile: Compact Button Style */}
              <div className="md:hidden w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm active:bg-gray-50 dark:active:bg-gray-700">
                <ArrowUpTrayIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Загрузить файл
                </span>
              </div>

              {/* Desktop: Full Dropzone */}
              <div className="hidden md:flex flex-col items-center justify-center py-1 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="mb-3 p-2 bg-white dark:bg-gray-700 rounded-full shadow-sm border border-gray-200 dark:border-gray-600">
                  <PaperClipIcon className="h-6 w-6 text-gray-400 dark:text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {isDragActive
                    ? "Отпустите файл"
                    : "Нажмите или перетащите файл"}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  JPG, PNG, PDF, DOCX до {maxFileSize / 1024 / 1024} МБ
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {(uploadError || deleteError) && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <XCircleIcon className="h-4 w-4" />
          {uploadError?.message || deleteError?.message}
        </p>
      )}
    </div>
  );
};

export default FileUpload;
