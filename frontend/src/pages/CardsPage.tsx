import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { getCardDisplayName } from "../utils/cardName";
import { cardApi } from "../api/cardApi";
import { cashApi, CashBalance } from "../api/cashApi"; // Import cashApi
import { CardData, CardBalanceData } from "../types/cardData";
import { cryptoApi, CryptoBalance, CryptoAsset } from "../api/cryptoApi";
import CryptoSelector from "../components/CryptoSelector";
import { Button } from "../components/Button";
import {
  BanknotesIcon,
  CreditCardIcon,
  PlusIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import {
  PencilIcon as PencilSolidIcon,
  TrashIcon as TrashSolidIcon,
} from "@heroicons/react/24/solid";
import { useToast } from "../context/ToastContext";
import { usePageTitle } from "../context/PageTitleContext";
import ConfirmModal from "../components/ConfirmModal";
import Modal from "../components/Modal";
import MobilePanel from "../components/MobilePanel";
import Spinner from "../components/Spinner";
import CardDisplay from "../components/CardDisplay";
import Select from "../components/Select";
import { TextInputField } from "../components/Input";
import { CURRENCY_OPTIONS, getCurrencySymbol } from "../utils/currencies"; // Import shared currencies
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const CASH_STORAGE_KEY = "cash_balances";
const BASE_CASH_CURRENCY = "RUB";

const cardBalanceSchema = z.object({
  currency: z.string().min(1, "Выберите валюту"),
  amount: z.coerce
    .number({ invalid_type_error: "Сумма должна быть числом" })
    .refine((value) => Number.isFinite(value), {
      message: "Сумма должна быть числом",
    }),
});

type CardBalanceFormInputs = z.infer<typeof cardBalanceSchema>;

// Mobile Actions Overlay
const MobileActionsOverlay: React.FC<{
  card: CardData | null;
  shouldClose: boolean;
  onClose: () => void;
  onEdit: (card: CardData) => void;
  onDelete: (card: CardData) => void;
}> = ({ card, shouldClose, onClose, onEdit, onDelete }) => {
  if (!card) return null;

  const actions = [
    {
      label: "Изменить",
      icon: PencilSolidIcon,
      handler: () => onEdit(card),
    },
    {
      label: "Удалить",
      icon: TrashSolidIcon,
      handler: () => onDelete(card),
    },
  ];

  return (
    <MobilePanel
      isOpen={!!card}
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

const CardsPage: React.FC = () => {
  const metadata = getPageMetadata("cards");
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardData[]>([]);
  const [cryptoBalances, setCryptoBalances] = useState<CryptoBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCryptoLoading, setIsCryptoLoading] = useState(true);
  const [cashBalances, setCashBalances] = useState<CashBalance[]>([]);
  const [isCashLoading, setIsCashLoading] = useState(true);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isCryptoModalOpen, setIsCryptoModalOpen] = useState(false);
  const [newCashCurrency, setNewCashCurrency] = useState<string | null>(null);
  const [selectedCryptoAsset, setSelectedCryptoAsset] =
    useState<CryptoAsset | null>(null);
  const [newCryptoQuantity, setNewCryptoQuantity] = useState("");
  const [newCryptoWallet, setNewCryptoWallet] = useState("");
  const [cashMobileActionCurrency, setCashMobileActionCurrency] = useState<
    string | null
  >(null);
  const [cryptoMobileActionId, setCryptoMobileActionId] = useState<
    string | null
  >(null);
  const [shouldCloseCashPanel, setShouldCloseCashPanel] = useState(false);
  const [shouldCloseCryptoPanel, setShouldCloseCryptoPanel] = useState(false);
  const [selectedCashCurrency, setSelectedCashCurrency] = useState<
    string | null
  >(null);
  const [selectedCryptoId, setSelectedCryptoId] = useState<string | null>(null);
  const [editingCashCurrency, setEditingCashCurrency] = useState<string | null>(
    null
  );
  const [editingCryptoBalance, setEditingCryptoBalance] =
    useState<CryptoBalance | null>(null);
  const [editingCryptoQuantity, setEditingCryptoQuantity] = useState("");
  const [editingCryptoWallet, setEditingCryptoWallet] = useState("");
  const [isCryptoEditModalOpen, setIsCryptoEditModalOpen] = useState(false);
  const [activeCardBalanceCard, setActiveCardBalanceCard] =
    useState<CardData | null>(null);
  const [editingCardBalance, setEditingCardBalance] =
    useState<CardBalanceData | null>(null);
  const [isCardBalanceModalOpen, setIsCardBalanceModalOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  const { showToast } = useToast();
  const { setPageTitle } = usePageTitle();
  const {
    register: registerCardBalance,
    handleSubmit: handleSubmitCardBalance,
    reset: resetCardBalanceForm,
    setValue: setCardBalanceValue,
    watch: watchCardBalance,
    clearErrors: clearCardBalanceErrors,
    formState: {
      errors: cardBalanceErrors,
      isSubmitting: isCardBalanceSubmitting,
    },
  } = useForm<CardBalanceFormInputs>({
    resolver: zodResolver(cardBalanceSchema),
    mode: "onChange",
    delayError: 1000,
    defaultValues: {
      currency: "",
      amount: 0,
    },
  });

  // Mobile actions state
  const [mobileActionsCard, setMobileActionsCard] = useState<CardData | null>(
    null
  );
  const [shouldCloseMobilePanel, setShouldCloseMobilePanel] = useState(false);
  const [selectedMobileCardId, setSelectedMobileCardId] = useState<
    string | null
  >(null);
  const mobileListRef = useRef<HTMLDivElement | null>(null);
  const cashInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Confirm modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    action: (() => void) | null;
    title: string;
    message: string;
  }>({ isOpen: false, action: null, title: "", message: "" });
  const [isConfirming, setIsConfirming] = useState(false);

  // Set page title
  useEffect(() => {
    setPageTitle("Источники");
  }, [setPageTitle]);

  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await cardApi.getCards();
      setCards(data);
    } catch {
      showToast("Ошибка загрузки карт", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const fetchCrypto = useCallback(async () => {
    setIsCryptoLoading(true);
    try {
      const data = await cryptoApi.getBalances();
      setCryptoBalances(data);
    } catch {
      showToast("Ошибка загрузки криптовалют", "error");
    } finally {
      setIsCryptoLoading(false);
    }
  }, [showToast]);

  // Migration and fetch logic for cash balances
  const fetchCash = useCallback(async () => {
    setIsCashLoading(true);
    try {
      const serverBalances = await cashApi.getBalances();

      // Check for local storage data to migrate
      const stored = localStorage.getItem(CASH_STORAGE_KEY);
      let localBalances: CashBalance[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            localBalances = parsed.map((b) => ({
              currency: b.currency.toUpperCase(),
              amount: Number(b.amount) || 0,
            }));
          }
        } catch (e) {
          console.error("Failed to parse local cash balances", e);
        }
      }

      // If server is empty but local has data (and not just the default RUB 0), migrate
      const isLocalNonDefault =
        localBalances.length > 0 &&
        !(
          localBalances.length === 1 &&
          localBalances[0].currency === "RUB" &&
          localBalances[0].amount === 0
        );

      if (serverBalances.length === 0 && isLocalNonDefault) {
        // Migrate local to server
        const merged = await cashApi.setBalances(localBalances);
        setCashBalances(merged);
        showToast("Балансы наличных синхронизированы", "success");
        localStorage.removeItem(CASH_STORAGE_KEY); // Clear local after migration
      } else {
        // Server has data or local is empty/default -> use server
        // Ensure RUB exists if list is empty
        if (serverBalances.length === 0) {
          const defaultBal = [{ currency: "RUB", amount: 0 }];
          // We don't necessarily need to save it to server immediately,
          // but for UI consistency let's set it in state
          setCashBalances(defaultBal);
        } else {
          setCashBalances(serverBalances);
        }
        // Clear local storage as we are now using server as source of truth
        if (stored) {
          localStorage.removeItem(CASH_STORAGE_KEY);
        }
      }
    } catch (error) {
      showToast("Ошибка загрузки наличных", "error");
      // Fallback to local storage if API fails?
      // For now, let's stick to error reporting, but maybe init from local if available
      const stored = localStorage.getItem(CASH_STORAGE_KEY);
      if (stored) {
        setCashBalances(JSON.parse(stored));
      } else {
        setCashBalances([{ currency: "RUB", amount: 0 }]);
      }
    } finally {
      setIsCashLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCards();
    fetchCrypto();
    fetchCash();
  }, [fetchCards, fetchCrypto, fetchCash]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);

    updateViewport();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateViewport);
    } else {
      mediaQuery.addListener(updateViewport);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", updateViewport);
      } else {
        mediaQuery.removeListener(updateViewport);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setCashMobileActionCurrency(null);
      setCryptoMobileActionId(null);
      setShouldCloseCashPanel(false);
      setShouldCloseCryptoPanel(false);
    }
  }, [isMobileViewport]);

  // Helper to sync changes to backend
  const updateCashBalancesBackend = async (newBalances: CashBalance[]) => {
    setCashBalances(newBalances);
    try {
      await cashApi.setBalances(newBalances);
    } catch (e) {
      showToast("Не удалось сохранить баланс", "error");
    }
  };

  const handleAddCard = () => {
    navigate("/sources/new");
  };

  const handleAddCrypto = async () => {
    if (!selectedCryptoAsset || !newCryptoQuantity) return;
    const qty = parseFloat(newCryptoQuantity.replace(",", "."));
    if (isNaN(qty) || qty <= 0) {
      showToast("Введите корректное количество", "error");
      return;
    }

    try {
      await cryptoApi.addBalance({
        coinId: selectedCryptoAsset.id,
        symbol: selectedCryptoAsset.symbol,
        name: selectedCryptoAsset.name,
        quantity: qty,
        walletAddress: newCryptoWallet.trim() || undefined,
      });
      showToast("Криптовалюта добавлена", "success");
      setIsCryptoModalOpen(false);
      setSelectedCryptoAsset(null);
      setNewCryptoQuantity("");
      setNewCryptoWallet("");
      fetchCrypto();
    } catch {
      showToast("Ошибка добавления", "error");
    }
  };

  const [editingCashAmount, setEditingCashAmount] = useState("");

  const startCryptoEdit = (balance: CryptoBalance) => {
    setEditingCryptoBalance(balance);
    setEditingCryptoQuantity(balance.quantity.toString());
    setEditingCryptoWallet(balance.walletAddress || "");
    setIsCryptoEditModalOpen(true);
  };

  const handleSaveCryptoEdit = async () => {
    if (!editingCryptoBalance) return;
    const qty = parseFloat(editingCryptoQuantity.replace(",", "."));

    if (isNaN(qty) || qty < 0) {
      showToast("Некорректное значение", "error");
      return;
    }

    try {
      // We are actually using updateBalance for quantity, but we need to support walletAddress update too.
      // Since updateBalance in API only takes quantity currently, I might need to update API or use addBalance logic?
      // Wait, updateBalance only takes quantity in the current implementation.
      // I need to update the API to accept walletAddress.

      // Let's first update the API call in this file, assuming I will fix the API function next.
      await cryptoApi.updateBalance(
        editingCryptoBalance.id,
        qty,
        editingCryptoWallet.trim() || undefined
      );

      showToast("Сохранено", "success");
      setIsCryptoEditModalOpen(false);
      setEditingCryptoBalance(null);
      fetchCrypto();
    } catch {
      showToast("Ошибка сохранения", "error");
    }
  };

  const handleDeleteCrypto = (id: string, name: string) => {
    const action = async () => {
      try {
        await cryptoApi.deleteBalance(id);
        showToast("Удалено", "success");
        fetchCrypto();
        if (selectedCryptoId === id) setSelectedCryptoId(null);
        if (editingCryptoBalance?.id === id) {
          setEditingCryptoBalance(null);
          setIsCryptoEditModalOpen(false);
        }
      } catch {
        showToast("Ошибка удаления", "error");
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: "Удалить актив",
      message: `Вы уверены, что хотите удалить ${name}?`,
    });
  };

  const handleCryptoBlockSelect = (balance: CryptoBalance) => {
    if (isMobileViewport && cryptoMobileActionId === balance.id) {
      setShouldCloseCryptoPanel(true);
      return;
    }

    setSelectedCryptoId(balance.id);
    if (isMobileViewport) {
      setShouldCloseCryptoPanel(false);
      setCryptoMobileActionId(balance.id);
    }
  };

  const closeCryptoMobilePanel = () => {
    setCryptoMobileActionId(null);
    setShouldCloseCryptoPanel(false);
    setSelectedCryptoId(null);
  };

  useEffect(() => {
    if (!selectedCryptoId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-crypto-block]")) {
        return;
      }
      if (target.closest("[data-mobile-panel-content]")) {
        return;
      }

      setSelectedCryptoId(null);
      setShouldCloseCryptoPanel(true);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [selectedCryptoId]);

  const getAvailableCardCurrencies = useCallback((card: CardData) => {
    const existing = new Set(
      (card.balances || []).map((balance) => balance.currency)
    );
    return CURRENCY_OPTIONS.filter((option) => !existing.has(option.value));
  }, []);

  useEffect(() => {
    if (!activeCardBalanceCard || !isCardBalanceModalOpen) return;
    const availableCurrencies = getAvailableCardCurrencies(
      activeCardBalanceCard
    );
    const initialCurrency =
      editingCardBalance?.currency || availableCurrencies[0]?.value || "";
    const initialAmount = editingCardBalance?.amount ?? 0;
    resetCardBalanceForm({
      currency: initialCurrency,
      amount: initialAmount,
    });
  }, [
    activeCardBalanceCard,
    editingCardBalance,
    getAvailableCardCurrencies,
    isCardBalanceModalOpen,
    resetCardBalanceForm,
  ]);

  const availableCashCurrencies = CURRENCY_OPTIONS.filter(
    (option) =>
      !cashBalances.some((balance) => balance.currency === option.value)
  );
  const canAddCashCurrency = availableCashCurrencies.length > 0;

  const openCashModal = () => {
    if (!canAddCashCurrency) return;
    setNewCashCurrency(availableCashCurrencies[0].value);
    setIsCashModalOpen(true);
  };

  const closeCashModal = () => {
    setIsCashModalOpen(false);
    setNewCashCurrency(null);
  };

  const handleAddCashCurrency = () => {
    if (!newCashCurrency) return;
    const updated = [...cashBalances, { currency: newCashCurrency, amount: 0 }];
    updateCashBalancesBackend(updated);
    closeCashModal();
  };

  const formatCashAmountValue = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCardBalanceAmount = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const parseCashAmount = (value: string) => {
    const normalized = value.replace(/\s/g, "").replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  const startCashEdit = (balance: CashBalance) => {
    if (editingCashCurrency === balance.currency) {
      const input = cashInputRefs.current[balance.currency];
      if (input) {
        input.focus();
      }
      return;
    }
    if (editingCashCurrency && editingCashCurrency !== balance.currency) {
      saveCashEdit();
    }
    setEditingCashCurrency(balance.currency);
    setEditingCashAmount(formatCashAmountValue(balance.amount));
    setSelectedCashCurrency(balance.currency);
  };

  const cancelCashEdit = () => {
    setEditingCashCurrency(null);
    setEditingCashAmount("");
  };

  const saveCashEdit = () => {
    if (!editingCashCurrency) return;
    const normalizedAmount =
      editingCashAmount.trim() === "" ? 0 : parseCashAmount(editingCashAmount);

    const updated = cashBalances.map((entry) =>
      entry.currency === editingCashCurrency
        ? { ...entry, amount: normalizedAmount }
        : entry
    );

    updateCashBalancesBackend(updated);
    cancelCashEdit();
  };

  const handleDeleteCashCurrency = (currency: string) => {
    if (currency === BASE_CASH_CURRENCY) return;
    const updated = cashBalances.filter((entry) => entry.currency !== currency);
    updateCashBalancesBackend(updated);

    if (editingCashCurrency === currency) {
      cancelCashEdit();
    }
    if (selectedCashCurrency === currency) {
      setSelectedCashCurrency(null);
    }
  };

  const handleRequestDeleteCashCurrency = (currency: string) => {
    if (currency === BASE_CASH_CURRENCY) return;
    setConfirmModalState({
      isOpen: true,
      action: () => handleDeleteCashCurrency(currency),
      title: "Удалить валюту",
      message: `Вы уверены, что хотите удалить валюту ${currency}?`,
    });
  };

  const handleCashBlockSelect = (balance: CashBalance) => {
    if (editingCashCurrency && editingCashCurrency !== balance.currency) {
      saveCashEdit();
    }

    if (isMobileViewport && cashMobileActionCurrency === balance.currency) {
      setShouldCloseCashPanel(true);
      return;
    }

    setSelectedCashCurrency(balance.currency);
    if (isMobileViewport) {
      setShouldCloseCashPanel(false);
      setCashMobileActionCurrency(balance.currency);
    }
  };

  const closeCashMobilePanel = () => {
    setCashMobileActionCurrency(null);
    setShouldCloseCashPanel(false);
    if (!editingCashCurrency) {
      setSelectedCashCurrency(null);
    }
  };

  useEffect(() => {
    if (!editingCashCurrency) return;
    const input = cashInputRefs.current[editingCashCurrency];
    if (input) {
      input.focus();
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }
  }, [editingCashCurrency]);

  useEffect(() => {
    if (!editingCashCurrency && !selectedCashCurrency) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-cash-block]")) {
        return;
      }
      if (target.closest("[data-mobile-panel-content]")) {
        return;
      }

      if (editingCashCurrency) {
        saveCashEdit();
      }
      setSelectedCashCurrency(null);
      setShouldCloseCashPanel(true);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [editingCashCurrency, selectedCashCurrency, saveCashEdit]);

  const closeCardBalanceModal = () => {
    setIsCardBalanceModalOpen(false);
    setActiveCardBalanceCard(null);
    setEditingCardBalance(null);
  };

  const updateCardBalancesBackend = async (
    cardId: string,
    balances: CardBalanceData[]
  ) => {
    setCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, balances } : card))
    );
    try {
      const saved = await cardApi.setBalances(
        cardId,
        balances.map((balance) => ({
          currency: balance.currency,
          amount: balance.amount,
        }))
      );
      setCards((prev) =>
        prev.map((card) =>
          card.id === cardId ? { ...card, balances: saved } : card
        )
      );
    } catch {
      showToast("Не удалось сохранить баланс карты", "error");
      fetchCards();
    }
  };

  const handleOpenAddCardBalance = (card: CardData) => {
    const available = getAvailableCardCurrencies(card);
    if (available.length === 0) return;
    setActiveCardBalanceCard(card);
    setEditingCardBalance(null);
    setIsCardBalanceModalOpen(true);
  };

  const handleOpenEditCardBalance = (
    card: CardData,
    balance: CardBalanceData
  ) => {
    setActiveCardBalanceCard(card);
    setEditingCardBalance(balance);
    setIsCardBalanceModalOpen(true);
  };

  const handleSubmitCardBalanceForm = async (data: CardBalanceFormInputs) => {
    if (!activeCardBalanceCard) return;
    const existingBalances = activeCardBalanceCard.balances || [];
    const updatedBalances = editingCardBalance
      ? existingBalances.map((balance) =>
          balance.currency === editingCardBalance.currency
            ? { ...balance, amount: data.amount }
            : balance
        )
      : [
          ...existingBalances,
          {
            currency: data.currency,
            amount: data.amount,
          },
        ];

    await updateCardBalancesBackend(activeCardBalanceCard.id, updatedBalances);
    closeCardBalanceModal();
  };

  const handleRequestDeleteCardBalance = (card: CardData, currency: string) => {
    setConfirmModalState({
      isOpen: true,
      action: () => {
        const updatedBalances = (card.balances || []).filter(
          (balance) => balance.currency !== currency
        );
        return updateCardBalancesBackend(card.id, updatedBalances);
      },
      title: "Удалить баланс",
      message: `Вы уверены, что хотите удалить баланс ${currency}?`,
    });
  };

  const handleEditCard = (card: CardData) => {
    navigate(`/sources/edit/${card.id}`);
  };

  const handleDeleteCard = (card: CardData) => {
    const action = async () => {
      try {
        await cardApi.deleteCard(card.id);
        showToast("Карта удалёна", "success");
        fetchCards();
      } catch {
        showToast("Ошибка удаления", "error");
      }
    };

    const cardName = getCardDisplayName(card.name, card.pan);

    setConfirmModalState({
      isOpen: true,
      action,
      title: "Удалить карту",
      message: `Вы уверены, что хотите удалить ${cardName}?`,
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

  // Mobile panel handlers
  const closeMobilePanel = useCallback(() => {
    setShouldCloseMobilePanel(true);
  }, []);

  useEffect(() => {
    if (!selectedMobileCardId) return;

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
  }, [selectedMobileCardId, closeMobilePanel]);

  const handleMobilePanelClosed = () => {
    setMobileActionsCard(null);
    setSelectedMobileCardId(null);
    setShouldCloseMobilePanel(false);
  };

  const handleMobileCardClick = (card: CardData) => {
    if (selectedMobileCardId === card.id) {
      closeMobilePanel();
      return;
    }

    setShouldCloseMobilePanel(false);
    setMobileActionsCard(card);
    setSelectedMobileCardId(card.id);
  };

  const activeCardBalanceOptions = activeCardBalanceCard
    ? editingCardBalance
      ? CURRENCY_OPTIONS.filter(
          (option) => option.value === editingCardBalance.currency
        ).length > 0
        ? CURRENCY_OPTIONS.filter(
            (option) => option.value === editingCardBalance.currency
          )
        : [
            {
              value: editingCardBalance.currency,
              label: editingCardBalance.currency,
            },
          ]
      : getAvailableCardCurrencies(activeCardBalanceCard)
    : [];
  const activeCardBalanceCurrency = watchCardBalance("currency");
  const isCardBalanceEditMode = Boolean(editingCardBalance);
  const cardBalanceTitle = isCardBalanceEditMode
    ? "Редактировать баланс"
    : "Добавить баланс";
  const cardBalanceAmountRegister = registerCardBalance("amount", {
    valueAsNumber: true,
  });

  const activeCashBalance = cashMobileActionCurrency
    ? cashBalances.find(
        (balance) => balance.currency === cashMobileActionCurrency
      ) || null
    : null;

  const activeCryptoBalance = cryptoMobileActionId
    ? cryptoBalances.find((b) => b.id === cryptoMobileActionId) || null
    : null;

  return (
    <>
      <PageMeta {...metadata} title="Источники" />
      <div className="max-w-5xl mx-auto pb-20 dark:text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="hidden md:block text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Источники
          </h2>
        </div>

        <div className="space-y-6">
          <section className="card-base p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <BanknotesIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Наличные
                  </h3>
                </div>
              </div>
              <Button
                variant="secondary"
                icon={<PlusIcon className="w-4 h-4" />}
                label="Добавить валюту"
                onClick={openCashModal}
                disabled={!canAddCashCurrency}
              />
            </div>

            {isCashLoading ? (
              <div className="flex justify-center items-center py-6">
                <Spinner />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {cashBalances.map((balance) => {
                  const isSelected = selectedCashCurrency === balance.currency;
                  const isEditing = editingCashCurrency === balance.currency;
                  const canDelete = balance.currency !== BASE_CASH_CURRENCY;
                  const amountClassName =
                    "text-2xl font-semibold text-gray-900 dark:text-gray-100";
                  const amountValue = formatCashAmountValue(balance.amount);
                  const currencySymbol = getCurrencySymbol(balance.currency);

                  return (
                    <div
                      key={balance.currency}
                      data-cash-block={balance.currency}
                      onClick={() => handleCashBlockSelect(balance)}
                      className={`relative flex items-center justify-between rounded-xl border bg-gray-50 px-4 py-3 transition-colors cursor-pointer dark:bg-gray-800/50 dark:border-gray-700/50 ${
                        isSelected
                          ? "ring-1 ring-indigo-500/20 border-indigo-200/80 dark:border-indigo-500/30"
                          : "border-gray-100 hover:border-gray-200 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-baseline gap-2">
                        {isEditing ? (
                          <input
                            ref={(node) => {
                              cashInputRefs.current[balance.currency] = node;
                            }}
                            value={editingCashAmount}
                            onChange={(event) =>
                              setEditingCashAmount(event.target.value)
                            }
                            inputMode="decimal"
                            className={`${amountClassName} bg-transparent border-none p-0 m-0 focus:outline-none min-w-[6ch]`}
                          />
                        ) : (
                          <span className={amountClassName}>{amountValue}</span>
                        )}
                        <span className={amountClassName}>
                          {currencySymbol}
                        </span>
                      </div>

                      {isSelected && !isEditing && !isMobileViewport && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              startCashEdit(balance);
                            }}
                            className="p-1.5 rounded-full bg-white/80 text-gray-500 hover:text-gray-700 hover:bg-white shadow-sm dark:bg-gray-900/70 dark:text-gray-300 dark:hover:text-gray-100"
                            aria-label={`Изменить сумму ${balance.currency}`}
                          >
                            <PencilSolidIcon
                              className={`w-4 h-4 ${
                                isEditing
                                  ? "text-indigo-600 dark:text-indigo-400"
                                  : ""
                              }`}
                            />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRequestDeleteCashCurrency(
                                  balance.currency
                                );
                              }}
                              className="p-1.5 rounded-full bg-white/80 text-gray-500 hover:text-red-600 hover:bg-white shadow-sm dark:bg-gray-900/70 dark:text-gray-300 dark:hover:text-red-400"
                              aria-label={`Удалить ${balance.currency}`}
                            >
                              <TrashSolidIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card-base p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                  <CreditCardIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Карты
                  </h3>
                </div>
              </div>
              <Button
                variant="secondary"
                icon={<PlusIcon className="w-4 h-4" />}
                label="Добавить карту"
                onClick={handleAddCard}
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Spinner />
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                Нет добавленных карт
              </div>
            ) : (
              <>
                {/* Desktop View - Card grid */}
                <div className="hidden md:grid gap-6 md:grid-cols-2 md:w-180 lg:w-auto m-auto">
                  {cards.map((card) => {
                    const balances = card.balances || [];
                    const availableCardCurrencies =
                      getAvailableCardCurrencies(card);
                    const canAddCardBalance =
                      availableCardCurrencies.length > 0;

                    return (
                      <div key={card.id} className="flex items-start gap-4">
                        <div className="relative group w-fit">
                          <CardDisplay
                            card={card}
                            size="medium"
                            onClick={() => handleEditCard(card)}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCard(card);
                            }}
                            className="absolute top-2 right-2 p-2 bg-black/30 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Удалить"
                          >
                            <TrashSolidIcon className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex-1 min-w-[12rem]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Балансы
                            </span>
                            <Button
                              variant="ghost"
                              size="small"
                              icon={<PlusIcon className="w-4 h-4" />}
                              label="Добавить"
                              onClick={() => handleOpenAddCardBalance(card)}
                              disabled={!canAddCardBalance}
                            />
                          </div>

                          {balances.length === 0 ? (
                            <div className="text-sm text-gray-400">
                              Баланс не задан
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {balances.map((balance) => {
                                const currencySymbol = getCurrencySymbol(
                                  balance.currency
                                );

                                return (
                                  <button
                                    key={balance.currency}
                                    type="button"
                                    onClick={() =>
                                      handleOpenEditCardBalance(card, balance)
                                    }
                                    className="w-full flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2 text-left transition-colors cursor-pointer dark:bg-gray-800/50 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600"
                                  >
                                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                      {formatCardBalanceAmount(balance.amount)}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      {currencySymbol}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile View - Card list */}
                <div
                  ref={mobileListRef}
                  className="flex flex-col md:hidden items-center gap-4"
                >
                  {cards.map((card) => {
                    const isSelected = selectedMobileCardId === card.id;
                    const balances = card.balances || [];
                    const availableCardCurrencies =
                      getAvailableCardCurrencies(card);
                    const canAddCardBalance =
                      availableCardCurrencies.length > 0;
                    return (
                      <div
                        key={card.id}
                        className={`transition-all duration-200 ${
                          isSelected
                            ? "scale-[1.02] shadow-xl relative z-50"
                            : ""
                        }`}
                      >
                        <CardDisplay
                          card={card}
                          size="medium"
                          onClick={() => handleMobileCardClick(card)}
                          className="mx-auto"
                        />
                        <div className="mt-3 w-full px-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Балансы
                            </span>
                            <Button
                              variant="ghost"
                              size="small"
                              icon={<PlusIcon className="w-4 h-4" />}
                              label="Добавить"
                              onClick={() => handleOpenAddCardBalance(card)}
                              disabled={!canAddCardBalance}
                            />
                          </div>
                          {balances.length === 0 ? (
                            <div className="text-sm text-gray-400">
                              Баланс не задан
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {balances.map((balance) => {
                                const currencySymbol = getCurrencySymbol(
                                  balance.currency
                                );

                                return (
                                  <button
                                    key={balance.currency}
                                    type="button"
                                    onClick={() =>
                                      handleOpenEditCardBalance(card, balance)
                                    }
                                    className="w-full flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2 text-left transition-colors cursor-pointer dark:bg-gray-800/50 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600"
                                  >
                                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                      {formatCardBalanceAmount(balance.amount)}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      {currencySymbol}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <section className="card-base p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <CurrencyDollarIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Криптовалюты
                  </h3>
                </div>
              </div>
              <Button
                variant="secondary"
                icon={<PlusIcon className="w-4 h-4" />}
                label="Добавить"
                onClick={() => setIsCryptoModalOpen(true)}
              />
            </div>

            {isCryptoLoading ? (
              <div className="flex justify-center items-center py-8">
                <Spinner />
              </div>
            ) : cryptoBalances.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                Нет добавленных активов
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cryptoBalances.map((balance) => {
                  const isSelected = selectedCryptoId === balance.id;

                  return (
                    <div
                      key={balance.id}
                      data-crypto-block={balance.id}
                      onClick={() => handleCryptoBlockSelect(balance)}
                      className={`relative flex flex-col justify-between rounded-xl border bg-gray-50 px-4 py-3 transition-colors cursor-pointer dark:bg-gray-800/50 dark:border-gray-700/50 group ${
                        isSelected
                          ? "ring-1 ring-orange-500/20 border-orange-200/80 dark:border-orange-500/30"
                          : "border-gray-100 hover:border-gray-200 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col min-w-0 pr-14">
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-gray-900 dark:text-gray-100">
                              {balance.name}
                            </span>
                            {balance.walletAddress && (
                              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                · {balance.walletAddress}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-end justify-between mt-auto">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                            <span>
                              {balance.quantity}{" "}
                              <span className="text-gray-500 dark:text-gray-400 text-xs uppercase">
                                {balance.symbol}
                              </span>
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Intl.NumberFormat("ru-RU", {
                              style: "currency",
                              currency: balance.currency.toUpperCase(),
                            }).format(balance.currentPrice)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight">
                            {new Intl.NumberFormat("ru-RU", {
                              style: "currency",
                              currency: balance.currency.toUpperCase(),
                            }).format(balance.totalValue)}
                          </div>
                        </div>
                      </div>

                      <div className="absolute right-2 top-2 hidden md:flex items-center gap-1">
                        {/* Removed inline editing buttons since we now use modal */}
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-transparent dark:border-gray-600/50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startCryptoEdit(balance);
                            }}
                            className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors"
                          >
                            <PencilSolidIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCrypto(balance.id, balance.name);
                            }}
                            className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <TrashSolidIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <Modal
          isOpen={isCryptoModalOpen}
          onClose={() => {
            setIsCryptoModalOpen(false);
            setSelectedCryptoAsset(null);
            setNewCryptoQuantity("");
            setNewCryptoWallet("");
          }}
          title="Добавить криптовалюту"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Актив
              </label>
              {selectedCryptoAsset ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedCryptoAsset.image}
                      alt={selectedCryptoAsset.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {selectedCryptoAsset.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedCryptoAsset.symbol.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCryptoAsset(null)}
                    className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
                  >
                    Изменить
                  </button>
                </div>
              ) : (
                <CryptoSelector onSelect={setSelectedCryptoAsset} />
              )}
            </div>

            {selectedCryptoAsset && (
              <>
                <TextInputField
                  label="Количество"
                  value={newCryptoQuantity}
                  onChange={(e) => setNewCryptoQuantity(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  inputMode="decimal"
                  autoFocus
                />
                <TextInputField
                  label="Кошелек / Заметка (необязательно)"
                  value={newCryptoWallet}
                  onChange={(e) => setNewCryptoWallet(e.target.value)}
                  placeholder="Название или адрес"
                />
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                label="Отмена"
                onClick={() => setIsCryptoModalOpen(false)}
              />
              <Button
                variant="primary"
                label="Добавить"
                onClick={handleAddCrypto}
                disabled={!selectedCryptoAsset || !newCryptoQuantity}
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isCashModalOpen}
          onClose={closeCashModal}
          title="Добавить валюту"
        >
          <div className="space-y-5">
            <Select
              label="Валюта"
              options={availableCashCurrencies}
              value={newCashCurrency}
              onChange={setNewCashCurrency}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" label="Отмена" onClick={closeCashModal} />
              <Button
                variant="primary"
                label="Добавить"
                onClick={handleAddCashCurrency}
                disabled={!newCashCurrency}
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isCardBalanceModalOpen && !isMobileViewport}
          onClose={closeCardBalanceModal}
          title={cardBalanceTitle}
        >
          <form
            onSubmit={handleSubmitCardBalance(handleSubmitCardBalanceForm)}
            className="space-y-5"
            noValidate
          >
            <Select
              label="Валюта"
              options={activeCardBalanceOptions}
              value={activeCardBalanceCurrency || null}
              onChange={(value) => {
                clearCardBalanceErrors("currency");
                setCardBalanceValue("currency", value || "", {
                  shouldValidate: true,
                });
              }}
              error={cardBalanceErrors.currency?.message}
              disabled={isCardBalanceEditMode}
            />
            <TextInputField
              label="Сумма"
              type="number"
              inputMode="decimal"
              step={0.01}
              {...cardBalanceAmountRegister}
              onChange={(event) => {
                clearCardBalanceErrors("amount");
                cardBalanceAmountRegister.onChange(event);
              }}
              error={cardBalanceErrors.amount?.message}
              required
              disabled={isCardBalanceSubmitting}
            />

            <div className="flex items-center justify-between pt-2">
              {isCardBalanceEditMode &&
                activeCardBalanceCard &&
                editingCardBalance && (
                  <Button
                    variant="destructive"
                    label="Удалить"
                    onClick={() =>
                      handleRequestDeleteCardBalance(
                        activeCardBalanceCard,
                        editingCardBalance.currency
                      )
                    }
                  />
                )}
              <div className="ml-auto flex gap-3">
                <Button
                  variant="ghost"
                  label="Отмена"
                  onClick={closeCardBalanceModal}
                />
                <Button
                  variant="primary"
                  type="submit"
                  label={isCardBalanceEditMode ? "Сохранить" : "Добавить"}
                  loading={isCardBalanceSubmitting}
                  disabled={!activeCardBalanceCurrency}
                />
              </div>
            </div>
          </form>
        </Modal>

        <MobilePanel
          isOpen={isCardBalanceModalOpen && isMobileViewport}
          onClose={closeCardBalanceModal}
          title={cardBalanceTitle}
        >
          <form
            onSubmit={handleSubmitCardBalance(handleSubmitCardBalanceForm)}
            className="space-y-5"
            noValidate
          >
            <Select
              label="Валюта"
              options={activeCardBalanceOptions}
              value={activeCardBalanceCurrency || null}
              onChange={(value) => {
                clearCardBalanceErrors("currency");
                setCardBalanceValue("currency", value || "", {
                  shouldValidate: true,
                });
              }}
              error={cardBalanceErrors.currency?.message}
              disabled={isCardBalanceEditMode}
            />
            <TextInputField
              label="Сумма"
              type="number"
              inputMode="decimal"
              step={0.01}
              {...cardBalanceAmountRegister}
              onChange={(event) => {
                clearCardBalanceErrors("amount");
                cardBalanceAmountRegister.onChange(event);
              }}
              error={cardBalanceErrors.amount?.message}
              required
              disabled={isCardBalanceSubmitting}
            />

            <div className="flex items-center justify-between pt-2">
              {isCardBalanceEditMode &&
                activeCardBalanceCard &&
                editingCardBalance && (
                  <Button
                    variant="destructive"
                    label="Удалить"
                    onClick={() =>
                      handleRequestDeleteCardBalance(
                        activeCardBalanceCard,
                        editingCardBalance.currency
                      )
                    }
                  />
                )}
              <div className="ml-auto flex gap-3">
                <Button
                  variant="ghost"
                  label="Отмена"
                  onClick={closeCardBalanceModal}
                />
                <Button
                  variant="primary"
                  type="submit"
                  label={isCardBalanceEditMode ? "Сохранить" : "Добавить"}
                  loading={isCardBalanceSubmitting}
                  disabled={!activeCardBalanceCurrency}
                />
              </div>
            </div>
          </form>
        </MobilePanel>

        <MobilePanel
          isOpen={!!activeCashBalance}
          onClose={closeCashMobilePanel}
          title=""
          shouldClose={shouldCloseCashPanel}
          enableBackdropClick={false}
        >
          {activeCashBalance && (
            <div className="flex justify-around items-center">
              <button
                onClick={() => {
                  startCashEdit(activeCashBalance);
                  setShouldCloseCashPanel(true);
                }}
                className="flex flex-col items-center justify-center gap-2 p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-24"
              >
                <PencilSolidIcon className="h-6 w-6" />
                <span className="text-sm">Изменить</span>
              </button>
              {activeCashBalance.currency !== BASE_CASH_CURRENCY && (
                <button
                  onClick={() => {
                    handleRequestDeleteCashCurrency(activeCashBalance.currency);
                    setShouldCloseCashPanel(true);
                  }}
                  className="flex flex-col items-center justify-center gap-2 p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-24"
                >
                  <TrashSolidIcon className="h-6 w-6" />
                  <span className="text-sm">Удалить</span>
                </button>
              )}
            </div>
          )}
        </MobilePanel>

        <MobilePanel
          isOpen={!!activeCryptoBalance}
          onClose={closeCryptoMobilePanel}
          title=""
          shouldClose={shouldCloseCryptoPanel}
          enableBackdropClick={false}
        >
          {activeCryptoBalance && (
            <div className="flex justify-around items-center">
              <button
                onClick={() => {
                  startCryptoEdit(activeCryptoBalance);
                  setShouldCloseCryptoPanel(true);
                }}
                className="flex flex-col items-center justify-center gap-2 p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-24"
              >
                <PencilSolidIcon className="h-6 w-6" />
                <span className="text-sm">Изменить</span>
              </button>
              <button
                onClick={() => {
                  handleDeleteCrypto(
                    activeCryptoBalance.id,
                    activeCryptoBalance.name
                  );
                  setShouldCloseCryptoPanel(true);
                }}
                className="flex flex-col items-center justify-center gap-2 p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-24"
              >
                <TrashSolidIcon className="h-6 w-6" />
                <span className="text-sm">Удалить</span>
              </button>
            </div>
          )}
        </MobilePanel>

        {/* Desktop: Modal */}
        <Modal
          isOpen={isCryptoEditModalOpen && !isMobileViewport}
          onClose={() => {
            setIsCryptoEditModalOpen(false);
            setEditingCryptoBalance(null);
          }}
          title="Редактировать криптовалюту"
        >
          <div className="space-y-5">
            {editingCryptoBalance && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
                <div className="font-bold text-gray-900 dark:text-gray-100 uppercase text-lg">
                  {editingCryptoBalance.symbol}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {editingCryptoBalance.name}
                </div>
              </div>
            )}

            <TextInputField
              label="Количество"
              value={editingCryptoQuantity}
              onChange={(e) => setEditingCryptoQuantity(e.target.value)}
              placeholder="0.00"
              type="number"
              inputMode="decimal"
              autoFocus
            />
            <TextInputField
              label="Кошелек / Заметка (необязательно)"
              value={editingCryptoWallet}
              onChange={(e) => setEditingCryptoWallet(e.target.value)}
              placeholder="Название или адрес"
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                label="Отмена"
                onClick={() => {
                  setIsCryptoEditModalOpen(false);
                  setEditingCryptoBalance(null);
                }}
              />
              <Button
                variant="primary"
                label="Сохранить"
                onClick={handleSaveCryptoEdit}
              />
            </div>
          </div>
        </Modal>

        {/* Mobile: Sliding Panel */}
        <MobilePanel
          isOpen={isCryptoEditModalOpen && isMobileViewport}
          onClose={() => {
            setIsCryptoEditModalOpen(false);
            setEditingCryptoBalance(null);
          }}
          title="Редактировать криптовалюту"
        >
          <div className="space-y-5">
            {editingCryptoBalance && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
                <div className="font-bold text-gray-900 dark:text-gray-100 uppercase text-lg">
                  {editingCryptoBalance.symbol}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {editingCryptoBalance.name}
                </div>
              </div>
            )}

            <TextInputField
              label="Количество"
              value={editingCryptoQuantity}
              onChange={(e) => setEditingCryptoQuantity(e.target.value)}
              placeholder="0.00"
              type="number"
              inputMode="decimal"
              autoFocus
            />
            <TextInputField
              label="Кошелек / Заметка (необязательно)"
              value={editingCryptoWallet}
              onChange={(e) => setEditingCryptoWallet(e.target.value)}
              placeholder="Название или адрес"
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                label="Отмена"
                onClick={() => {
                  setIsCryptoEditModalOpen(false);
                  setEditingCryptoBalance(null);
                }}
              />
              <Button
                variant="primary"
                label="Сохранить"
                onClick={handleSaveCryptoEdit}
              />
            </div>
          </div>
        </MobilePanel>

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
          card={mobileActionsCard}
          shouldClose={shouldCloseMobilePanel}
          onClose={handleMobilePanelClosed}
          onEdit={handleEditCard}
          onDelete={handleDeleteCard}
        />
      </div>
    </>
  );
};

export default CardsPage;
