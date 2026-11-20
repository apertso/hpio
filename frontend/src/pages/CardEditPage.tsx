import { useLanguage } from "../context/LanguageContext";
import { PageHeader, PageContent } from "../components/layout/Page";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cardApi } from "../api/cardApi";
import { CardData } from "../types/cardData";
import Spinner from "../components/Spinner";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { usePageTitle } from "../context/PageTitleContext";
import { Button } from "../components/Button";
import { TextInputField } from "../components/Input";
import CardDisplay from "../components/CardDisplay";
import { useToast } from "../context/ToastContext";
import useDebounce from "../hooks/useDebounce";
import { getVendorDisplayName } from "../utils/cardVendor";
import { getCardDisplayName, getCardFallbackName } from "../utils/cardName";
import { usePreferredCurrency } from "../context/AuthContext";

const formatCardPan = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  return digits.match(/.{1,4}/g)?.join(" ") ?? "";
};

const CardEditPage: React.FC = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = usePageTitle();
  const { showToast } = useToast();
  const preferredCurrency = usePreferredCurrency();
  const isEditMode = !!id;
  const metadata = getPageMetadata("cards");

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Card data state
  const [pan, setPan] = useState("");
  const [cardName, setCardName] = useState("");
  const [shouldShowNameField, setShouldShowNameField] = useState(false);
  const [bankName, setBankName] = useState("");
  const [vendor, setVendor] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [cardCurrency, setCardCurrency] = useState(preferredCurrency);

  useEffect(() => {
    if (!isEditMode) {
      setCardCurrency(preferredCurrency);
    }
  }, [isEditMode, preferredCurrency]);
  const initialPanRef = useRef<string | null>(null);

  const debouncedPan = useDebounce(pan, 800);
  const displayVendor = getVendorDisplayName(vendor);

  // Set page title
  useEffect(() => {
    const headerText = isEditMode ? t("Редактировать карту") : t("Новая карта");
    setPageTitle(headerText);
  }, [isEditMode, setPageTitle, t]);

  // Load card data when editing
  useEffect(() => {
    if (isEditMode && id) {
      setIsLoading(true);
      cardApi
        .getCard(id)
        .then((card) => {
          const cleanedPan = (card.pan || "").replace(/\s/g, "");
          const trimmedName = card.name?.trim() || "";
          initialPanRef.current = cleanedPan;
          setPan(formatCardPan(card.pan || ""));
          setCardName(
            trimmedName || (cleanedPan ? getCardFallbackName(cleanedPan) : "")
          );
          setBankName(card.bankName || "");
          setVendor(card.vendor || null);
          setType(card.type || null);
          setLevel(card.level || null);
          setCountry(card.country || null);
          setCardCurrency(card.currency || preferredCurrency);
          setShouldShowNameField(cleanedPan.length >= 6);
        })
        .catch(() => {
          showToast("Ошибка загрузки карты", "error");
          navigate("/sources");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, isEditMode, navigate, preferredCurrency, showToast]);

  // BIN lookup for auto-fill (only for new cards or when PAN changes significantly)
  const lookupBin = useCallback(async (binNumber: string) => {
    if (binNumber.length >= 6) {
      const info = await cardApi.lookupBin(binNumber);
      if (info) {
        if (info.bank_name) setBankName(info.bank_name);
        if (info.vendor) setVendor(info.vendor);
        if (info.type) setType(info.type);
        if (info.level) setLevel(info.level);
        if (info.country) setCountry(info.country);
      }
      setShouldShowNameField(true);
      setCardName((prev) =>
        prev.trim() ? prev : getCardFallbackName(binNumber)
      );
    }
  }, []);

  useEffect(() => {
    // Only auto-lookup for new cards or if PAN changes
    const cleanedPan = debouncedPan.replace(/\s/g, "");
    if (cleanedPan.length >= 6) {
      if (
        isEditMode &&
        initialPanRef.current !== null &&
        cleanedPan === initialPanRef.current
      ) {
        setShouldShowNameField(true);
        return;
      }
      lookupBin(cleanedPan);
      return;
    }
    setShouldShowNameField(false);
  }, [debouncedPan, isEditMode, lookupBin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanedPan = pan.replace(/\s/g, "");
    if (!cleanedPan || cleanedPan.length < 6) {
      setFormError(t("Введите минимум первые 6 цифр номера карты"));
      return;
    }

    const resolvedCardName = getCardDisplayName(cardName, cleanedPan);
    setIsSubmitting(true);

    const cardData: Partial<CardData> = {
      pan: cleanedPan,
      bankName,
      vendor,
      type,
      level,
      country,
      name: resolvedCardName,
      currency: cardCurrency,
      balance: 0, // Default, not shown to user
    };

    try {
      if (isEditMode && id) {
        await cardApi.updateCard(id, cardData);
        showToast("Карта обновлена", "success");
      } else {
        await cardApi.createCard(cardData);
        showToast("Карта добавлена", "success");
      }
      navigate("/sources");
    } catch {
      setFormError(
        isEditMode
          ? t("Ошибка при обновлении карты")
          : t("Ошибка при добавлении карты")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview card data
  const previewCard: CardData = {
    id: id || "preview",
    pan: pan || "",
    bankName: bankName || null,
    vendor: vendor || null,
    type: type || null,
    level: level || null,
    country: country || null,
    name: getCardDisplayName(cardName, pan),
    currency: cardCurrency,
    balance: 0,
    createdAt: "",
    updatedAt: "",
  };

  const combinedIsLoading = isSubmitting || isLoading;

  return (
    <>
      <PageMeta {...metadata} />
      <div className="dark:text-gray-100">
        <PageHeader
          breadcrumbs={[{ label: t("Источники"), to: "/sources" }]}
          title={isEditMode ? t("Редактировать карту") : t("Новая карта")}
        />
        <PageContent width="form">
        <div>
          {isLoading && isEditMode ? (
            <div className="flex justify-center items-center h-40">
              <Spinner />
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left column: Form */}
                <div className="flex flex-col">
                  {formError && (
                    <div
                      className="ui-alert-error mb-6"
                      role="alert"
                    >
                      {t(formError)}
                    </div>
                  )}

                  <div className="mb-6">
                    <TextInputField
                      label={t("Номер карты")}
                      value={pan}
                      onChange={(e) => setPan(formatCardPan(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      disabled={combinedIsLoading}
                      required
                    />
                  </div>

                  {/* Auto-filled info (read-only display) */}
                  {(bankName || vendor || type || level) && (
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("Определено автоматически:")}
                      </div>
                      {bankName && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            {t("Банк:")}
                          </span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {bankName}
                          </span>
                        </div>
                      )}
                      {displayVendor && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            {t("Платёжная система:")}
                          </span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {displayVendor}
                          </span>
                        </div>
                      )}
                      {type && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            {t("Тип:")}
                          </span>
                          <span className="text-gray-900 dark:text-gray-100 capitalize">
                            {type}
                          </span>
                        </div>
                      )}
                      {level && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            {t("Уровень:")}
                          </span>
                          <span className="text-gray-900 dark:text-gray-100 capitalize">
                            {level}
                          </span>
                        </div>
                      )}
                      {country && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            {t("Страна:")}
                          </span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {country}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {shouldShowNameField && (
                    <div className="mb-6">
                      <TextInputField
                        label={t("Название карты")}
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder={getCardFallbackName(pan)}
                        disabled={combinedIsLoading}
                      />
                    </div>
                  )}

                  {/* Desktop buttons */}
                  <div className="hidden md:flex items-center justify-end space-x-4 mt-auto pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/sources")}
                      disabled={combinedIsLoading}
                      label={t("Отмена")}
                    />
                    <Button
                      variant="primary"
                      type="submit"
                      loading={combinedIsLoading}
                      disabled={combinedIsLoading}
                      label={t("Сохранить")}
                    />
                  </div>

                  {/* Mobile buttons */}
                  <div className="flex flex-col md:hidden mt-6 space-y-3">
                    <Button
                      variant="primary"
                      size="large"
                      type="submit"
                      loading={combinedIsLoading}
                      disabled={combinedIsLoading}
                      label={t("Сохранить")}
                      className="w-full"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/sources")}
                      disabled={combinedIsLoading}
                      label={t("Отмена")}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Right column: Card preview */}
                <div className="flex flex-col items-center justify-center order-first md:order-last mb-6 md:mb-0">
                  <CardDisplay card={previewCard} size="large" />
                </div>
              </div>
            </form>
          )}
        </div>
        </PageContent>
      </div>
    </>
  );
};

export default CardEditPage;
