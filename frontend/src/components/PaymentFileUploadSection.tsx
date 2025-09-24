import React, { useState, useCallback, useEffect } from "react";
import FileUpload from "./FileUpload"; // Import the FileUpload component

interface PaymentFileUploadSectionProps {
  paymentId?: string;
  isSubmitting: boolean;
  setFormError: React.Dispatch<React.SetStateAction<string | null>>; // Keep setFormError prop
  initialFile?: { filePath: string; fileName: string } | null; // Optional initial file prop
  onPendingFileChange?: (file: File | null) => void; // Notify parent about selected file before creation
}

const PaymentFileUploadSection: React.FC<PaymentFileUploadSectionProps> = ({
  paymentId,
  isSubmitting,
  setFormError, // Keep setFormError prop
  initialFile, // Optional initial file prop
  onPendingFileChange,
}) => {
  // State for attached file
  const [attachedFile, setAttachedFile] = useState<{
    filePath: string;
    fileName: string;
  } | null>(null);

  useEffect(() => {
    if (initialFile) {
      setAttachedFile(initialFile);
    }
  }, [initialFile]);

  // Handlers for FileUpload callbacks
  const handleFileUploadSuccess = useCallback(
    (fileInfo: { filePath: string; fileName: string }) => {
      setAttachedFile(fileInfo);
      setFormError(null); // Use setFormError prop
    },
    [setFormError] // Dependency on setFormError prop
  );

  const handleFileDeleteSuccess = useCallback(() => {
    setAttachedFile(null);
    setFormError(null); // Use setFormError prop
  }, [setFormError]); // Dependency on setFormError prop

  const handleFileUploadError = useCallback(
    (message: string) => {
      setFormError(`Ошибка: ${message}`); // Use setFormError prop
    },
    [setFormError]
  ); // Dependency on setFormError prop

  return (
    <div>
      {/* Компонент FileUpload */}
      <FileUpload
        paymentId={paymentId} // ID платежа (undefined при создании)
        initialFile={attachedFile} // Use local state
        onFileUploadSuccess={handleFileUploadSuccess} // Use local handler
        onFileDeleteSuccess={handleFileDeleteSuccess} // Use local handler
        onError={handleFileUploadError} // Use local handler
        isSubmitting={isSubmitting} // Pass isSubmitting to disable upload during form submission
        onPendingFileChange={onPendingFileChange}
      />
    </div>
  );
};

export default PaymentFileUploadSection;
