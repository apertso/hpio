import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import PaymentForm from "../components/PaymentForm";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
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
        ? "Редактировать платеж"
        : "Редактировать серию"
      : "Добавить платеж";
    setPageTitle(headerText);
  }, [isEditMode, editScope, setPageTitle]);

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
      ? "Редактировать платеж"
      : "Редактировать серию"
    : "Добавить платеж";

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
      <div className="max-w-4xl mx-auto">
        {/* Title and back button shown only on desktop - on mobile it's in the header */}
        <div className="hidden md:flex items-center mb-6">
          <button
            onClick={handleCancel}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200"
            aria-label="Назад"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <h2 className="text-xl md:text-2xl font-bold ml-4 text-gray-900 dark:text-white flex items-center gap-3">
            {headerText}
            {seriesInactive && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                Серия неактивна
              </span>
            )}
          </h2>
        </div>

        <FormBlock className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Spinner />
            </div>
          ) : error ? (
            <div
              className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative"
              role="alert"
            >
              {error}
            </div>
          ) : (
            <>
              {showEditScopeHeader && (
                <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-700/20">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Это повторяющийся платеж. Что вы хотите изменить?
                  </h4>
                  <SegmentedControl
                    options={[
                      { value: "single", label: "Только этот платеж" },
                      { value: "series", label: "Вся серия" },
                    ]}
                    selected={editScope}
                    onChange={(val) => setEditScope(val as "single" | "series")}
                    className="w-full"
                    optionClassName="flex-1 justify-center"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
                    {editScope === "single"
                      ? "Изменения коснутся только текущего платежа. Остальные платежи серии останутся прежними."
                      : "Изменения будут применены к этому и всем будущим платежам серии. Прошлые платежи не изменятся."}
                  </p>
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
      </div>
    </>
  );
};

export default PaymentEditPage;
