import React, { useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Input } from "./Input";

interface FeedbackTextareaProps {
  value: string;
  onChange: (value: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  placeholder?: string;
  maxFileSize?: number;
}

const FeedbackTextarea: React.FC<FeedbackTextareaProps> = ({
  value,
  onChange,
  file,
  onFileChange,
  placeholder = "Ваш отзыв...",
  maxFileSize = 5 * 1024 * 1024, // 5MB
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [highlighted, setHighlighted] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      if (uploadedFile.size > maxFileSize) {
        alert(
          `Файл слишком большой. Максимальный размер: ${
            maxFileSize / 1024 / 1024
          }MB`
        );
        return;
      }
      onFileChange(uploadedFile);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    maxSize: maxFileSize,
  });

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      if (uploadedFile.size > maxFileSize) {
        alert(
          `Файл слишком большой. Максимальный размер: ${
            maxFileSize / 1024 / 1024
          }MB`
        );
        return;
      }
      onFileChange(uploadedFile);
    }
  };

  const handleRemoveFile = () => {
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  React.useEffect(() => {
    const keywords = [
      "скриншот",
      "изображение",
      "файл",
      "прикрепить",
      "screenshot",
      "image",
      "file",
      "attach",
    ];
    const hasKeyword = keywords.some((keyword) =>
      value.toLowerCase().includes(keyword)
    );
    setHighlighted(hasKeyword);
  }, [value]);

  return (
    <div {...getRootProps()} className="relative">
      <div
        className={`relative border-2 rounded-lg transition-all ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600"
        }`}
      >
        <textarea
          className="block w-full bg-white dark:bg-gray-900 rounded-lg p-3 pr-12 text-sm text-gray-900 dark:text-gray-100 focus:outline-none transition duration-150 ease-in-out resize-none border-0"
          rows={6}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="absolute bottom-3 right-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`relative p-2 rounded-full transition-colors cursor-pointer focus:outline-none bg-gray-50 dark:bg-gray-700 ${
              highlighted
                ? "text-blue-600 dark:text-blue-400 animate-pulse"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            title="Прикрепить файл"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
            {highlighted && (
              <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></span>
            )}
          </button>
          <Input
            {...getInputProps()}
            ref={fileInputRef}
            type="file"
            className="sr-only"
            onChange={handleFileInputChange}
            accept="*/*"
            unstyled
          />
        </div>
      </div>
      {isDragActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/90 dark:bg-blue-900/30 rounded-lg pointer-events-none">
          <p className="text-blue-600 dark:text-blue-400 font-medium">
            Перетащите файл сюда...
          </p>
        </div>
      )}
      {file && (
        <div className="mt-2 flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <svg
            className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="text-sm text-gray-700 dark:text-gray-300 flex-grow truncate">
            {file.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            {(file.size / 1024).toFixed(1)} KB
          </span>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="p-1 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex-shrink-0"
            title="Удалить файл"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default FeedbackTextarea;
