import { useLanguage } from "../context/LanguageContext";
import { PageHeader, PageContent } from "../components/layout/Page";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import PaymentForm from "../components/PaymentForm";
import FormBlock from "../components/FormBlock";
import axiosInstance from "../api/axiosInstance";
import { PaymentData } from "../types/paymentData";
import Spinner from "../components/Spinner";
import logger from "../utils/logger";
import getErrorMessage from "../utils/getErrorMessage";
import SegmentedControl from "../components/SegmentedControl";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { usePageTitle } from "../context/PageTitleContext";

const PaymentEditPage: React.FC = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = usePageTitle();
  const [searchParams] = useSearchParams();
  const isEditMode = !!id;
  const metadata = getPageMetadata("payments"); // Используем метаданные платежей для страниц редактирования
  const markAsCompletedInitial = searchParams.get("markAsCompleted") === "true";

  // Новое состояние
  const [initialData, setInitialData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<"single" | "series">("single");
  const [isRepeatEnabled, setIsRepeatEnabled] = useState<boolean>(true); // Отслеживаем, включен ли повтор в данный момент

  useEffect(() => {
    if (isEditMode && id) {
      setIsLoading(true);
      axiosInstance
        .get<PaymentData>(`/payments/${id}`)
        .then((res) => {
          setInitialData(res.data);
          // Инициализируем состояние повторения на основе того, имеет ли платеж серию
          setIsRepeatEnabled(!!res.data.seriesId);
        })
        .catch((err) => {
          logger.error(`Failed to fetch payment ${id}`, err);
          setError(getErrorMessage(err));
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, isEditMode]);

  // Устанавливаем заголовок страницы для мобильного заголовка
  useEffect(() => {
    const headerText = isEditMode
      ? editScope === "single"
        ? t("Редактировать платеж")
        : t("Редактировать серию")
      : t("Добавить платеж");
    setPageTitle(headerText);
  }, [isEditMode, editScope, setPageTitle, t]);

  const handleSuccess = () => {
    navigate(-1);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const isSeriesPayment = !!initialData?.seriesId;

  // Показывать заголовок области редактирования только когда:
  // 1. In edit mode AND
  // 2. Payment has a series AND
  // 3. Repeat is currently enabled (user hasn't toggled it off)
  const showEditScopeHeader = isEditMode && isSeriesPayment && isRepeatEnabled;

  const headerText = isEditMode
    ? editScope === "single"
      ? t("Редактировать платеж")
      : t("Редактировать серию")
    : t("Добавить платеж");

  const seriesInactive =
    editScope === "series" && !!initialData?.series
      ? !initialData.series.isActive ||
        (!!initialData.series.recurrenceEndDate &&
          (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const end = new Date(
              initialData.series!.recurrenceEndDate as string
            );
            end.setHours(0, 0, 0, 0);
            return end < today;
          })())
      : false;

  return (
    <>
      <PageMeta {...metadata} />
      <div className="dark:text-gray-100">
        <PageHeader
          breadcrumbs={[{ label: t("Платежи"), to: "/payments" }]}
          title={headerText}
          titleAddon={
            seriesInactive ? (
              <span className="badge ml-1 border border-[var(--ui-border-strong)] text-gray-600 dark:text-gray-400">
                {t("Серия неактивна")}
              </span>
            ) : undefined
          }
        />
        <PageContent width="form">
        <FormBlock>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Spinner />
            </div>
          ) : error ? (
            <div
              className="ui-alert-error"
              role="alert"
            >
              {t(error)}
            </div>
          ) : (
            <>
              {showEditScopeHeader && (
                <div className="mb-8 flex flex-col gap-3 rounded-lg border border-[var(--ui-border)] bg-gray-50/60 p-4 dark:bg-white/[0.02] md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t("Это повторяющийся платеж. Что вы хотите изменить?")}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {editScope === "single"
                      ? t("Изменения коснутся только текущего платежа. Остальные платежи серии останутся прежними.")
                      : t("Изменения будут применены к этому и всем будущим платежам серии. Прошлые платежи не изменятся.")}
                  </p>
                  </div>
                  <SegmentedControl
                    options={[
                      { value: "single", label: t("Только этот платеж") },
                      { value: "series", label: t("Вся серия") },
                    ]}
                    selected={editScope}
                    onChange={(val) => setEditScope(val as "single" | "series")}
                    className="w-full shrink-0 md:w-auto"
                    optionClassName="flex-1 justify-center"
                  />
                </div>
              )}
              <PaymentForm
                paymentId={id}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
                initialData={initialData}
                editScope={isSeriesPayment ? editScope : "single"}
                isSeriesInactive={seriesInactive}
                markAsCompletedInitial={markAsCompletedInitial}
                onRepeatChange={setIsRepeatEnabled}
              />
            </>
          )}
        </FormBlock>
        </PageContent>
      </div>
    </>
  );
};

export default PaymentEditPage;
