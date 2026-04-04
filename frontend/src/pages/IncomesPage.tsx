import React, { useEffect, useState, useRef, useCallback } from "react";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { incomeApi } from "../api/incomeApi";
import { cardApi } from "../api/cardApi";
import { IncomeData, CreateIncomeData } from "../types/incomeData";
import { CardData } from "../types/cardData";
import { Button } from "../components/Button";
import { PlusIcon } from "@heroicons/react/24/outline";
import {
  PencilIcon as PencilSolidIcon,
  TrashIcon as TrashSolidIcon,
} from "@heroicons/react/24/solid";
import Modal from "../components/Modal";
import { useToast } from "../context/ToastContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextInputField, NumberField } from "../components/Input";
import DatePicker from "../components/DatePicker";
import PaymentCategorySelect from "../components/PaymentCategorySelect";
import CryptoSelector from "../components/CryptoSelector";
import { CryptoAsset } from "../api/cryptoApi";
import { usePageTitle } from "../context/PageTitleContext";
import ConfirmModal from "../components/ConfirmModal";
import MobilePanel from "../components/MobilePanel";
import Spinner from "../components/Spinner";
import Select from "../components/Select";
import { CURRENCY_OPTIONS as CURRENCY_OPTIONS } from "../utils/currencies";
import { formatDateForDisplay } from "../utils/dateUtils";

const METHOD_LABELS: Record<string, string> = {
  cash: "Наличные",
  card: "Карта",
  transfer: "Перевод",
  other: "Другое",
};

const METHOD_OPTIONS = [
  { value: "cash", label: "Наличные" },
  { value: "card", label: "Карта" },
  { value: "transfer", label: "Перевод" },
  { value: "other", label: "Другое" },
];

const incomeFormSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Сумма должна быть числом" })
    .min(0.01, "Сумма должна быть больше 0"),
  exchangeRate: z.coerce.number().optional(),
  comment: z.string().optional(),
});

type IncomeFormInputs = z.infer<typeof incomeFormSchema>;

interface IncomeFormProps {
  income?: IncomeData | null;
  cards: CardData[];
  onSuccess: () => void;
  onCancel: () => void;
}

const IncomeForm: React.FC<IncomeFormProps> = ({
  income,
  cards,
  onSuccess,
  onCancel,
}) => {
  const isEditMode = !!income;
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormInputs>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      amount: undefined,
      exchangeRate: 1,
      comment: "",
    },
  });

  const [date, setDate] = useState<Date | null>(new Date());
  const [currency, setCurrency] = useState("RUB");
  const [method, setMethod] = useState("transfer");
  const [cardId, setCardId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showCrypto, setShowCrypto] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAsset | null>(
    null
  );
  const [formError, setFormError] = useState<string | null>(null);

  const watchedCurrency = currency;

  // Populate form when editing
  useEffect(() => {
    if (income) {
      reset({
        amount: income.amount,
        exchangeRate: income.exchangeRate || 1,
        comment: income.comment || "",
      });
      setDate(new Date(income.date));
      setCurrency(income.currency);
      setMethod(income.method);
      setCardId(income.card?.id || null);
      setCategoryId(income.transactionCategory?.id || null);
    }
  }, [income, reset]);

  const handleCryptoSelect = (asset: CryptoAsset) => {
    setSelectedCrypto(asset);
    setCurrency(asset.symbol.toUpperCase());
    setShowCrypto(false);
  };

  const onSubmit = async (data: IncomeFormInputs) => {
    setFormError(null);
    if (!date) {
      setFormError("Дата обязательна");
      return;
    }

    const payload: CreateIncomeData = {
      amount: data.amount,
      currency,
      date: date.toISOString().split("T")[0],
      method,
      categoryId: categoryId || null,
      cardId: method === "card" ? cardId : null,
      comment: data.comment,
    };

    // Add exchange rate if not RUB
    if (currency !== "RUB" && data.exchangeRate) {
      (payload as CreateIncomeData & { exchangeRate?: number }).exchangeRate =
        data.exchangeRate;
    }

    try {
      if (isEditMode && income) {
        await incomeApi.updateIncome(income.id, payload);
        showToast("Доход обновлен", "success");
      } else {
        await incomeApi.createIncome(payload);
        showToast("Доход добавлен", "success");
      }
      onSuccess();
    } catch {
      setFormError(
        isEditMode ? "Ошибка при обновлении" : "Ошибка при добавлении"
      );
      showToast("Ошибка", "error");
    }
  };

  // Build currency options with crypto if selected
  const currencyOptions = selectedCrypto
    ? [
        ...CURRENCY_OPTIONS,
        {
          value: selectedCrypto.symbol.toUpperCase(),
          label: selectedCrypto.symbol.toUpperCase(),
        },
      ]
    : CURRENCY_OPTIONS;

  // Build card options
  const cardOptions = [
    { value: null, label: "-- Выберите карту --" },
    ...cards.map((card) => ({
      value: card.id,
      label: `${card.name}${card.pan ? ` (*${card.pan.slice(-4)})` : ""}`,
    })),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {formError && (
        <div
          className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg"
          role="alert"
        >
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumberField
          label="Сумма"
          step={0.01}
          {...register("amount", { valueAsNumber: true })}
          error={errors.amount?.message}
          required
          disabled={isSubmitting}
        />

        <div className="space-y-1">
          <Select
            label="Валюта"
            options={currencyOptions}
            value={currency}
            onChange={(val) => setCurrency(val || "RUB")}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowCrypto(!showCrypto)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {showCrypto ? "Скрыть крипто" : "Выбрать крипто"}
          </button>
        </div>
      </div>

      {showCrypto && <CryptoSelector onSelect={handleCryptoSelect} />}

      {watchedCurrency !== "RUB" && (
        <NumberField
          label="Курс обмена (к RUB)"
          step={0.000001}
          {...register("exchangeRate", { valueAsNumber: true })}
          disabled={isSubmitting}
        />
      )}

      <DatePicker
        selected={date}
        onSingleChange={(d) => setDate(d)}
        label="Дата"
        disabled={isSubmitting}
      />

      <Select
        label="Способ получения"
        options={METHOD_OPTIONS}
        value={method}
        onChange={(val) => setMethod(val || "transfer")}
        disabled={isSubmitting}
      />

      {method === "card" && cards.length > 0 && (
        <Select
          label="Карта"
          options={cardOptions}
          value={cardId}
          onChange={(val) => setCardId(val)}
          disabled={isSubmitting}
        />
      )}

      <PaymentCategorySelect
        watchCategoryId={categoryId}
        setValue={(_, value) => setCategoryId(value as string | null)}
        errors={{}}
        isSubmitting={isSubmitting}
        categoryType="income"
      />

      <TextInputField
        label="Комментарий"
        {...register("comment")}
        placeholder="Необязательно"
        disabled={isSubmitting}
      />

      {/* Desktop buttons */}
      <div className="hidden md:flex justify-end space-x-4 pt-4">
        <Button
          variant="ghost"
          onClick={onCancel}
          label="Отмена"
          disabled={isSubmitting}
        />
        <Button
          variant="primary"
          type="submit"
          label="Сохранить"
          loading={isSubmitting}
        />
      </div>

      {/* Mobile buttons */}
      <div className="flex flex-col md:hidden space-y-3 pt-4">
        <Button
          variant="primary"
          size="large"
          type="submit"
          label="Сохранить"
          loading={isSubmitting}
          className="w-full"
        />
        <Button
          variant="ghost"
          onClick={onCancel}
          label="Отмена"
          disabled={isSubmitting}
          className="w-full"
        />
      </div>
    </form>
  );
};

// Mobile Actions Overlay
const MobileActionsOverlay: React.FC<{
  income: IncomeData | null;
  shouldClose: boolean;
  onClose: () => void;
  onEdit: (income: IncomeData) => void;
  onDelete: (income: IncomeData) => void;
}> = ({ income, shouldClose, onClose, onEdit, onDelete }) => {
  if (!income) return null;

  const actions = [
    {
      label: "Изменить",
      icon: PencilSolidIcon,
      handler: () => onEdit(income),
    },
    {
      label: "Удалить",
      icon: TrashSolidIcon,
      handler: () => onDelete(income),
    },
  ];

  return (
    <MobilePanel
      isOpen={!!income}
      onClose={onClose}
      title=""
      shouldClose={shouldClose}
      enableBackdropClick={false}
    >
      <div className="flex justify-around items-center">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              action.handler();
              onClose();
            }}
            className="flex flex-col items-center justify-center gap-2 p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-24"
          >
            <action.icon className="h-6 w-6" />
            <span className="text-sm">{action.label}</span>
          </button>
        ))}
      </div>
    </MobilePanel>
  );
};

// Income List Item for mobile
const IncomeListItem: React.FC<{
  income: IncomeData;
  className?: string;
}> = ({ income, className }) => (
  <button
    type="button"
    data-mobile-list-item-id={income.id}
    className={`w-full text-left card-base card-hover p-4 ${className || ""}`}
  >
    <div className="flex justify-between items-center">
      <div>
        <div className="font-bold dark:text-white">
          {income.transactionCategory?.name || "Без категории"}
        </div>
        <div className="text-sm text-gray-500">
          {formatDateForDisplay(new Date(income.date))} ·{" "}
          {METHOD_LABELS[income.method] || income.method}
          {income.card && ` · ${income.card.name}`}
        </div>
        {income.comment && (
          <div className="text-xs text-gray-400 mt-1">{income.comment}</div>
        )}
      </div>
      <div className="font-bold text-green-600">
        +
        {new Intl.NumberFormat("ru-RU", {
          style: "currency",
          currency: income.currency,
        }).format(income.amount)}
      </div>
    </div>
  </button>
);

const IncomesPage: React.FC = () => {
  const metadata = getPageMetadata("incomes");
  const [incomes, setIncomes] = useState<IncomeData[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeData | null>(null);
  const { showToast } = useToast();
  const { setPageTitle, setHeaderRightAction } = usePageTitle();

  // Mobile actions state
  const [mobileActionsIncome, setMobileActionsIncome] =
    useState<IncomeData | null>(null);
  const [shouldCloseMobilePanel, setShouldCloseMobilePanel] = useState(false);
  const selectedMobileIncomeId = mobileActionsIncome?.id ?? null;
  const mobileListRef = useRef<HTMLDivElement | null>(null);

  // Confirm modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    action: (() => void) | null;
    title: string;
    message: string;
  }>({ isOpen: false, action: null, title: "", message: "" });
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    setPageTitle("Доходы");
  }, [setPageTitle]);

  // Set header right action (+ button for mobile)
  useEffect(() => {
    setHeaderRightAction(
      <button
        type="button"
        onClick={() => {
          setEditingIncome(null);
          setIsModalOpen(true);
        }}
        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
      >
        <PlusIcon className="w-6 h-6" />
      </button>
    );

    return () => setHeaderRightAction(null);
  }, [setHeaderRightAction]);

  useEffect(() => {
    cardApi
      .getCards()
      .then(setCards)
      .catch(() => {});
  }, []);

  const fetchIncomes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await incomeApi.getIncomes();
      setIncomes(data);
    } catch {
      showToast("Ошибка загрузки доходов", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const handleAddIncome = () => {
    setEditingIncome(null);
    setIsModalOpen(true);
  };

  const handleEditIncome = (income: IncomeData) => {
    setEditingIncome(income);
    setIsModalOpen(true);
  };

  const handleDeleteIncome = (income: IncomeData) => {
    const action = async () => {
      try {
        await incomeApi.deleteIncome(income.id);
        showToast("Запись удалена", "success");
        fetchIncomes();
      } catch {
        showToast("Ошибка удаления", "error");
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: "Удалить запись",
      message: "Вы уверены, что хотите удалить эту запись о доходе?",
    });
  };

  const onConfirmAction = async () => {
    if (confirmModalState.action) {
      setIsConfirming(true);
      await confirmModalState.action();
      setIsConfirming(false);
    }
    setConfirmModalState({
      isOpen: false,
      action: null,
      title: "",
      message: "",
    });
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setEditingIncome(null);
    fetchIncomes();
  };

  const handleFormCancel = () => {
    setIsModalOpen(false);
    setEditingIncome(null);
  };

  // Mobile panel handlers
  const closeMobilePanel = useCallback(() => {
    setShouldCloseMobilePanel(true);
  }, []);

  useEffect(() => {
    if (!selectedMobileIncomeId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (mobileListRef.current?.contains(target)) {
        return;
      }

      if (target.closest("[data-mobile-panel-content]")) {
        return;
      }

      closeMobilePanel();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [selectedMobileIncomeId, closeMobilePanel]);

  const handleMobilePanelClosed = () => {
    setMobileActionsIncome(null);
    setShouldCloseMobilePanel(false);
  };

  const handleMobileListClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLElement)) return;

    const itemElement = event.target.closest<HTMLElement>(
      "[data-mobile-list-item-id]"
    );

    if (itemElement?.dataset.mobileListItemId) {
      const { mobileListItemId } = itemElement.dataset;

      if (selectedMobileIncomeId === mobileListItemId) {
        closeMobilePanel();
        return;
      }

      const nextIncome = incomes.find((i) => i.id === mobileListItemId);

      if (nextIncome) {
        setShouldCloseMobilePanel(false);
        setMobileActionsIncome(nextIncome);
      }
      return;
    }

    if (event.target === event.currentTarget && selectedMobileIncomeId) {
      closeMobilePanel();
    }
  };

  return (
    <>
      <PageMeta {...metadata} title="Доходы" />
      <div className="max-w-4xl mx-auto pb-20 dark:text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="hidden md:block text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Доходы
          </h2>
          <Button
            icon={<PlusIcon className="w-4 h-4" />}
            label="Добавить доход"
            onClick={handleAddIncome}
            className="hidden md:inline-flex"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Desktop/Tablet View */}
            <div className="hidden md:block space-y-3">
              {incomes.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Нет записей о доходах
                </div>
              ) : (
                incomes.map((inc) => (
                  <div
                    key={inc.id}
                    className="card-base p-4 flex justify-between items-center group"
                  >
                    <div>
                      <div className="font-bold dark:text-white">
                        {inc.transactionCategory?.name || "Без категории"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateForDisplay(new Date(inc.date))} ·{" "}
                        {METHOD_LABELS[inc.method] || inc.method}
                        {inc.card && ` · ${inc.card.name}`}
                      </div>
                      {inc.comment && (
                        <div className="text-xs text-gray-400 mt-1">
                          {inc.comment}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-bold text-green-600">
                        +
                        {new Intl.NumberFormat("ru-RU", {
                          style: "currency",
                          currency: inc.currency,
                        }).format(inc.amount)}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditIncome(inc)}
                          className="p-2 text-gray-400 hover:text-indigo-500 transition-colors"
                          title="Редактировать"
                        >
                          <PencilSolidIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteIncome(inc)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Удалить"
                        >
                          <TrashSolidIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mobile Card View */}
            <div
              ref={mobileListRef}
              onClick={handleMobileListClick}
              className="block md:hidden space-y-2"
            >
              {incomes.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Нет записей о доходах
                </div>
              ) : (
                incomes.map((income) => {
                  const isSelected = selectedMobileIncomeId === income.id;
                  const cardStateClasses = [
                    "transition-all duration-200",
                    isSelected ? "border-gray-400 shadow-md relative z-50" : "",
                  ]
                    .filter((cls) => cls)
                    .join(" ");
                  return (
                    <IncomeListItem
                      key={income.id}
                      income={income}
                      className={cardStateClasses}
                    />
                  );
                })
              )}
            </div>
          </>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={handleFormCancel}
          title={editingIncome ? "Редактировать доход" : "Добавить доход"}
        >
          <IncomeForm
            income={editingIncome}
            cards={cards}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </Modal>

        <ConfirmModal
          isOpen={confirmModalState.isOpen}
          onClose={() =>
            setConfirmModalState({
              isOpen: false,
              action: null,
              title: "",
              message: "",
            })
          }
          onConfirm={onConfirmAction}
          title={confirmModalState.title}
          message={confirmModalState.message}
          confirmText="Да, удалить"
          isConfirming={isConfirming}
        />

        <MobileActionsOverlay
          income={mobileActionsIncome}
          shouldClose={shouldCloseMobilePanel}
          onClose={handleMobilePanelClosed}
          onEdit={handleEditIncome}
          onDelete={handleDeleteIncome}
        />
      </div>
    </>
  );
};

export default IncomesPage;
