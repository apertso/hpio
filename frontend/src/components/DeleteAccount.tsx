import React, { useState } from "react";
import Modal from "./Modal";
import MobilePanel from "./MobilePanel";
import RadioButton from "./RadioButton";
import FeedbackTextarea from "./FeedbackTextarea";
import ToggleSwitch from "./ToggleSwitch";
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface DeleteAccountProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    reason: string,
    feedback: string,
    file: File | null
  ) => Promise<void>;
  isDeleting: boolean;
}

type DeletionReason =
  | "no_answer"
  | "not_using"
  | "privacy_concerns"
  | "found_alternative"
  | "other";

// Shared components and logic
const reasonOptions: { value: DeletionReason; label: string }[] = [
  { value: "no_answer", label: "Я не хочу отвечать" },
  { value: "not_using", label: "Я больше не пользуюсь сервисом" },
  { value: "privacy_concerns", label: "Беспокойство о конфиденциальности" },
  { value: "found_alternative", label: "Нашёл альтернативный продукт" },
  { value: "other", label: "Другое" },
];

const WarningMessage: React.FC = () => (
  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
    <p className="text-sm text-red-800 dark:text-red-200">
      <strong>Внимание:</strong> Это действие необратимо. Все ваши данные будут
      безвозвратно удалены.
    </p>
  </div>
);

const ReasonSelection: React.FC<{
  reason: DeletionReason;
  onReasonChange: (reason: DeletionReason) => void;
}> = ({ reason, onReasonChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
      Почему вы хотите удалить свой аккаунт?
    </label>
    <div className="space-y-3">
      {reasonOptions.map((option) => (
        <div
          key={option.value}
          className={`p-3 rounded-lg border ring-1 transition-all ${
            reason === option.value
              ? "border-blue-600 ring-blue-600 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-gray-700 ring-transparent"
          }`}
        >
          <RadioButton
            id={`reason-${option.value}`}
            name="reason"
            value={option.value}
            checked={reason === option.value}
            onChange={() => onReasonChange(option.value)}
            label={
              <span
                className={
                  reason === option.value
                    ? "font-bold text-blue-600 dark:text-blue-400"
                    : ""
                }
              >
                {option.label}
              </span>
            }
          />
        </div>
      ))}
    </div>
  </div>
);

const FeedbackSection: React.FC<{
  reason: DeletionReason;
  feedback: string;
  file: File | null;
  onFeedbackChange: (feedback: string) => void;
  onFileChange: (file: File | null) => void;
}> = ({ reason, feedback, file, onFeedbackChange, onFileChange }) =>
  reason === "other" ? (
    <div className="mt-6">
      <FeedbackTextarea
        value={feedback}
        onChange={onFeedbackChange}
        file={file}
        onFileChange={onFileChange}
        placeholder="Пожалуйста, укажите причину подробнее (необязательно)"
      />
    </div>
  ) : null;

const AgreementSection: React.FC<{
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
  isDeleting: boolean;
}> = ({ agreed, onAgreedChange, isDeleting }) => (
  <div className="flex items-center gap-3 mb-4">
    <ToggleSwitch
      checked={agreed}
      onChange={onAgreedChange}
      disabled={isDeleting}
    />
    <span className="text-sm text-gray-900 dark:text-gray-100">
      Я понимаю, и всё равно хочу удалить аккаунт.
    </span>
  </div>
);

const ActionButtons: React.FC<{
  onConfirm: () => void;
  isDeleting: boolean;
  agreed: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}> = ({ onConfirm, isDeleting, agreed, showBackButton = false, onBack }) => (
  <div
    className={`flex ${
      showBackButton ? "justify-between" : "justify-end"
    } pt-6`}
  >
    {showBackButton && (
      <button
        type="button"
        onClick={onBack}
        disabled={isDeleting}
        className="text-gray-500 dark:text-gray-400 font-bold py-2 px-5 rounded-lg hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150 ease-in-out text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Назад
      </button>
    )}
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onConfirm}
        disabled={!agreed || isDeleting}
        className="bg-red-600 text-white font-bold py-2 px-5 rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 transition-all duration-150 ease-in-out text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
      >
        <TrashIcon className="w-4 h-4" />
        {isDeleting ? "Удаление..." : "Удалить мой аккаунт"}
      </button>
    </div>
  </div>
);

// Shared content component
const DeleteAccountContent: React.FC<{
  currentStep: 1 | 2;
  setCurrentStep: (step: 1 | 2) => void;
  reason: DeletionReason;
  setReason: (reason: DeletionReason) => void;
  feedback: string;
  setFeedback: (feedback: string) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  agreed: boolean;
  setAgreed: (agreed: boolean) => void;
  isDeleting: boolean;
  handleClose: () => void;
  handleSubmit: () => void;
  showHeader?: boolean;
}> = ({
  currentStep,
  setCurrentStep,
  reason,
  setReason,
  feedback,
  setFeedback,
  file,
  setFile,
  agreed,
  setAgreed,
  isDeleting,
  handleClose,
  handleSubmit,
  showHeader = true,
}) => (
  <>
    {showHeader && (
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white text-2xl">
          Удалить аккаунт
        </h3>
        <button
          onClick={handleClose}
          className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    )}

    <div className="space-y-6">
      <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-6"
      >
        {currentStep === 1 && (
          <div>
            <ReasonSelection reason={reason} onReasonChange={setReason} />
            <FeedbackSection
              reason={reason}
              feedback={feedback}
              file={file}
              onFeedbackChange={setFeedback}
              onFileChange={setFile}
            />

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={!reason}
                className="bg-red-600 text-white font-bold py-2 px-5 rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 transition-all duration-150 ease-in-out text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                Далее
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <WarningMessage />
            <div className="mt-6">
              <AgreementSection
                agreed={agreed}
                onAgreedChange={setAgreed}
                isDeleting={isDeleting}
              />
            </div>
            <ActionButtons
              onConfirm={handleSubmit}
              isDeleting={isDeleting}
              agreed={agreed}
              showBackButton={true}
              onBack={() => setCurrentStep(1)}
            />
          </div>
        )}
      </form>
    </div>
  </>
);

const DeleteAccount: React.FC<DeleteAccountProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState<DeletionReason>("no_answer");
  const [feedback, setFeedback] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);

  const handleClose = () => {
    if (!isDeleting) {
      resetState();
      onClose();
    }
  };

  const resetState = () => {
    setCurrentStep(1);
    setReason("no_answer");
    setFeedback("");
    setFile(null);
    setAgreed(false);
  };

  const handleSubmit = async () => {
    if (!agreed || isDeleting) return;
    await onConfirm(reason, feedback, file);
  };

  if (!isOpen) return null;

  const sharedProps = {
    currentStep,
    setCurrentStep,
    reason,
    setReason,
    feedback,
    setFeedback,
    file,
    setFile,
    agreed,
    setAgreed,
    isDeleting,
    handleClose,
    handleSubmit,
  };

  return (
    <>
      {/* Desktop Modal */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        showCloseButton={false}
        className="hidden md:flex"
      >
        <DeleteAccountContent {...sharedProps} />
      </Modal>

      {/* Mobile Panel */}
      <MobilePanel
        isOpen={isOpen}
        onClose={handleClose}
        title="Удалить аккаунт"
        showCloseButton={true}
      >
        <DeleteAccountContent {...sharedProps} showHeader={false} />
      </MobilePanel>
    </>
  );
};

export default DeleteAccount;
