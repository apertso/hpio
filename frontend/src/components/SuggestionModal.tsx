import React, { useState } from "react";
import ReactDOM from "react-dom";
import { XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useToast } from "../context/ToastContext";
import Select from "./Select";
import Checkbox from "./Checkbox";
import useCategories from "../hooks/useCategories";
import axiosInstance from "../api/axiosInstance";
import { suggestionApi } from "../api/suggestionApi";
import { merchantRuleApi } from "../api/merchantRuleApi";
import { normalizeMerchantName } from "../utils/merchantNormalizer";

interface ParsedSuggestion {
  id: string;
  merchantName: string;
  amount: number;
  notificationData: string;
}

interface SuggestionModalProps {
  isOpen: boolean;
  suggestions: ParsedSuggestion[];
  onClose: () => void;
  onComplete: () => void;
}

type ContentVariant = "desktop" | "mobile";

const SuggestionModal: React.FC<SuggestionModalProps> = ({
  isOpen,
  suggestions,
  onClose,
  onComplete,
}) => {
  const { showToast } = useToast();
  const { categories } = useCategories();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [createRule, setCreateRule] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || suggestions.length === 0) return null;

  const currentSuggestion = suggestions[currentIndex];
  const selectedCategoryName = categories?.find(
    (c) => c.id === selectedCategoryId
  )?.name;

  const categoryOptions = [
    { value: null, label: "Без категории" },
    ...(categories?.map((cat) => ({
      value: cat.id,
      label: cat.name,
    })) || []),
  ];

  const handleAccept = async () => {
    try {
      setIsProcessing(true);

      await suggestionApi.acceptSuggestion(currentSuggestion.id);

      const today = new Date().toISOString().split("T")[0];

      await axiosInstance.post("/payments", {
        title: currentSuggestion.merchantName,
        amount: currentSuggestion.amount,
        dueDate: today,
        categoryId: selectedCategoryId || null,
        createAsCompleted: true,
        autoCreated: true,
      });

      if (createRule && selectedCategoryId) {
        const normalizedMerchant = normalizeMerchantName(
          currentSuggestion.merchantName
        );
        await merchantRuleApi.createMerchantRule({
          categoryId: selectedCategoryId,
          merchantKeyword: normalizedMerchant,
        });
      }

      showToast(
        `Платёж "${currentSuggestion.merchantName}" успешно добавлен`,
        "success"
      );

      if (currentIndex < suggestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedCategoryId("");
        setCreateRule(false);
      } else {
        onComplete();
        onClose();
      }
    } catch (error) {
      console.error("Error accepting suggestion:", error);
      showToast("Не удалось добавить платёж", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = async () => {
    try {
      setIsProcessing(true);

      await suggestionApi.dismissSuggestion(currentSuggestion.id);

      if (currentIndex < suggestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedCategoryId("");
        setCreateRule(false);
      } else {
        onComplete();
        onClose();
      }
    } catch (error) {
      console.error("Error dismissing suggestion:", error);
      showToast("Не удалось отклонить предложение", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  const renderContent = (variant: ContentVariant) => (
    <div
      className={`bg-white dark:bg-gray-900 shadow-2xl overflow-hidden ${
        variant === "mobile" ? "rounded-xl" : "rounded-2xl w-full max-w-md"
      }`}
    >
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              Новый платёж обнаружен
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              {currentIndex + 1} из {suggestions.length}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-2 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Продавец
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentSuggestion.merchantName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Сумма
            </span>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {Math.abs(currentSuggestion.amount).toFixed(2)} ₽
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Выберите категорию
          </label>
          <Select
            options={categoryOptions || []}
            value={selectedCategoryId}
            onChange={(value) => setSelectedCategoryId(value || "")}
            placeholder="Выберите категорию"
          />
        </div>

        {selectedCategoryId && selectedCategoryName && (
          <div className="flex items-start gap-3">
            <Checkbox
              id="createRule"
              checked={createRule}
              onChange={(e) => setCreateRule(e.target.checked)}
            />
            <label
              htmlFor="createRule"
              className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              Всегда относить платежи от "
              <strong>{currentSuggestion.merchantName}</strong>" в категорию "
              <strong>{selectedCategoryName}</strong>"
            </label>
          </div>
        )}
      </div>

      <div className="px-6 pb-6 space-y-3">
        <button
          onClick={handleAccept}
          disabled={isProcessing}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <CheckIcon className="w-5 h-5" />
          {isProcessing ? "Обработка..." : "Добавить платёж"}
        </button>
        <button
          onClick={handleDismiss}
          disabled={isProcessing}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 py-2 transition-colors disabled:opacity-50"
        >
          Пропустить
        </button>
      </div>
    </div>
  );

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      {renderContent("desktop")}
    </div>,
    document.body
  );
};

export default SuggestionModal;
