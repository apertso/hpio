import { useLanguage } from "../context/LanguageContext";
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useToast } from "../context/ToastContext";
import Select from "./Select";
import Checkbox from "./Checkbox";
import useCategories from "../hooks/useCategories";
import axiosInstance from "../api/axiosInstance";
import { suggestionApi } from "../api/suggestionApi";
import { merchantRuleApi } from "../api/merchantRuleApi";
import { normalizeNotificationTimestamp } from "../utils/dateUtils";
import logger from "../utils/logger";
import { formatMoney } from "../utils/currencies";
import { localizedCategoryName } from "../utils/categoryLabel";

interface ParsedSuggestion {
  id: string;
  merchantName: string;
  amount: number;
  notificationData: string;
  notificationTimestamp?: number | null;
}

interface SuggestionModalProps {
  isOpen: boolean;
  suggestions: ParsedSuggestion[];
  onClose: () => void;
  onComplete: () => void;
  onSuggestionProcessed: (suggestionId: string) => void;
}

type ContentVariant = "desktop" | "mobile";

const SuggestionModal: React.FC<SuggestionModalProps> = ({
  isOpen,
  suggestions,
  onClose,
  onComplete,
  onSuggestionProcessed,
}) => {
  const { t, locale, language } = useLanguage();
  // Компонент временно не используется, оставлен для возможного возврата.
  const { showToast } = useToast();
  const { categories } = useCategories();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [createRule, setCreateRule] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Сбрасываем индекс, если он выходит за границы массива после обновления suggestions
  useEffect(() => {
    if (currentIndex >= suggestions.length && suggestions.length > 0) {
      setCurrentIndex(0);
      setSelectedCategoryId("");
      setCreateRule(false);
    }
  }, [suggestions, currentIndex]);

  if (!isOpen || suggestions.length === 0) return null;

  const currentSuggestion = suggestions[currentIndex];

  // Защита от undefined
  if (!currentSuggestion) {
    return null;
  }
  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);
  const selectedCategoryName = selectedCategory
    ? localizedCategoryName(selectedCategory, language)
    : undefined;

  const categoryOptions = [
    { value: null, label: t("Без категории") },
    ...(categories?.map((cat) => ({
      value: cat.id,
      label: localizedCategoryName(cat, language),
    })) || []),
  ];

  const handleAccept = async () => {
    try {
      setIsProcessing(true);

      await suggestionApi.acceptSuggestion(currentSuggestion.id);

      const today = new Date().toISOString().split("T")[0];

      const completedAt = normalizeNotificationTimestamp(
        currentSuggestion.notificationTimestamp
      );

      const payload: Record<string, unknown> = {
        title: currentSuggestion.merchantName,
        amount: currentSuggestion.amount,
        dueDate: today,
        categoryId: selectedCategoryId || null,
        createAsCompleted: true,
        autoCreated: true,
      };

      if (completedAt) {
        payload.completedAt = completedAt;
      }

      await axiosInstance.post("/payments", payload);

      if (createRule && selectedCategoryId) {
        await merchantRuleApi.createMerchantRule({
          categoryId: selectedCategoryId,
          merchantKeyword: currentSuggestion.merchantName,
        });
      }

      showToast(
        t("Платёж \"{1}\" успешно добавлен", currentSuggestion.merchantName),
        "success"
      );

      // Отмечаем предложение как обработанное
      onSuggestionProcessed(currentSuggestion.id);

      if (currentIndex < suggestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedCategoryId("");
        setCreateRule(false);
      } else {
        onComplete();
        onClose();
      }
    } catch (error) {
      logger.error("Error accepting suggestion:", error);
      showToast(t("Не удалось добавить платёж"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = async () => {
    try {
      setIsProcessing(true);

      await suggestionApi.dismissSuggestion(currentSuggestion.id);

      // Отмечаем предложение как обработанное
      onSuggestionProcessed(currentSuggestion.id);

      if (currentIndex < suggestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedCategoryId("");
        setCreateRule(false);
      } else {
        onComplete();
        onClose();
      }
    } catch (error) {
      logger.error("Error dismissing suggestion:", error);
      showToast(t("Не удалось отклонить предложение"), "error");
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
      className={`bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-2xl overflow-hidden ${
        variant === "mobile" ? "rounded-lg" : "rounded-lg w-full max-w-md"
      }`}
    >
      <div className="border-b border-[var(--ui-border)] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              {t("Новый платёж обнаружен")}
            </h2>
            <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400 mt-0.5">
              {currentIndex + 1}{t(" из ")}{suggestions.length}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="-mr-1.5 flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <XMarkIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="rounded-lg border border-[var(--ui-border)] divide-y divide-[var(--ui-border)]">
          <div className="flex items-center justify-between gap-4 px-3 h-10">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("Продавец")}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
              {currentSuggestion?.merchantName || "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 px-3 h-10">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("Сумма")}
            </span>
            <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-50">
              {formatMoney(Math.abs(currentSuggestion?.amount || 0), locale)}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
            {t("Выберите категорию")}
          </label>
          <Select
            options={categoryOptions || []}
            value={selectedCategoryId}
            onChange={(value) => setSelectedCategoryId(value || "")}
            placeholder={t("Выберите категорию")}
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
              {t("Всегда относить платежи от \"")}
              <strong>{currentSuggestion?.merchantName || "—"}</strong>{t("\" в категорию \"")}<strong>{selectedCategoryName}</strong>"
            </label>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 space-y-1">
        <button
          onClick={handleAccept}
          disabled={isProcessing}
          className="primary-action w-full cursor-pointer text-sm font-medium h-9 px-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <CheckIcon className="size-4" />
          {isProcessing ? t("Обработка...") : t("Добавить платёж")}
        </button>
        <button
          onClick={handleDismiss}
          disabled={isProcessing}
          className="w-full h-9 rounded-md text-center text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {t("Пропустить")}
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
