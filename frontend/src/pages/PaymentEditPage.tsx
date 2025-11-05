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
import RadioButton from "../components/RadioButton";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { usePageTitle } from "../context/PageTitleContext";

const PaymentEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = usePageTitle();
  const [searchParams] = useSearchParams();
  const isEditMode = !!id;
  const metadata = getPageMetadata("payments"); // Using payments metadata for edit pages
  const markAsCompletedInitial = searchParams.get("markAsCompleted") === "true";

  // New state
  const [initialData, setInitialData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<"single" | "series">("single");
  const [isRepeatEnabled, setIsRepeatEnabled] = useState<boolean>(true); // Track if repeat is currently enabled

  useEffect(() => {
    if (isEditMode && id) {
      setIsLoading(true);
      axiosInstance
        .get<PaymentData>(`/payments/${id}`)
        .then((res) => {
          setInitialData(res.data);
          // Initialize repeat enabled state based on whether payment has a series
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

  // Set page title for mobile header
  useEffect(() => {
    const headerText = isEditMode
      ? editScope === "single"
        ? "Редактировать платеж"
        : "Редактировать серию"
      : "Добавить платеж";
    setPageTitle(headerText);
  }, [isEditMode, editScope, setPageTitle]);

  const handleSuccess = () => {
    navigate("/dashboard");
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const isSeriesPayment = !!initialData?.seriesId;

  // Only show edit scope header when:
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

        <FormBlock>
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
                <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Это повторяющийся платеж. Что вы хотите изменить?
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <RadioButton
                      id="edit-single"
                      name="edit-scope"
                      value="single"
                      checked={editScope === "single"}
                      onChange={() => setEditScope("single")}
                      label="Только этот платеж"
                    />
                    <RadioButton
                      id="edit-series"
                      name="edit-scope"
                      value="series"
                      checked={editScope === "series"}
                      onChange={() => setEditScope("series")}
                      label="Этот и все будущие платежи"
                    />
                  </div>
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
