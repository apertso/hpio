// src/components/PaymentForm.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axiosInstance from "../api/axiosInstance";
import { AxiosError } from "axios";
import logger from "../utils/logger";
import "react-datepicker/dist/react-datepicker.css";
import IconPicker from "./IconPicker"; // !!! Импорт компонента IconPicker

import PaymentDetailsSection from "./PaymentDetailsSection";

import PaymentCategorySelect from "./PaymentCategorySelect";
import PaymentRecurrenceSection from "./PaymentRecurrenceSection";
import PaymentFileUploadSection from "./PaymentFileUploadSection";

// Интерфейс для данных иконки (как в IconPicker)
interface PaymentIconInfo {
  iconType: "builtin" | "custom" | null;
  builtinIconName?: string | null;
  iconPath?: string | null;
}

// Схема валидации формы платежа
// НЕ добавляем здесь поля iconType, builtinIconName, iconPath - они управляются IconPicker и передаются через callback
const paymentFormSchema = z.object({
  title: z
    .string()
    .min(1, "Название обязательно")
    .max(255, "Название слишком длинное"),
  amount: z
    .number({ invalid_type_error: "Сумма должна быть числом" })
    .min(0.01, "Сумма должна быть больше 0"),
  dueDate: z.date({
    required_error: "Дата срока оплаты обязательна",
    invalid_type_error: "Неверный формат даты",
  }),
  categoryId: z
    .string()
    .uuid("Неверный формат ID категории")
    .nullable()
    .optional()
    .or(z.literal("")), // Allow empty string for "Без категории"
  // !!! Поля рекуррентности
  isRecurrent: z.boolean().optional(), // Чекбокс
  // Шаблон повторения - обязателен, если isRecurrent true
  recurrencePattern: z
    .enum(["daily", "weekly", "monthly", "yearly"])
    .nullable()
    .optional(), // Может быть null, если isRecurrent false
  // Дата окончания - опциональна, если isRecurrent true
  recurrenceEndDate: z
    .date({ invalid_type_error: "Неверный формат даты окончания" })
    .nullable()
    .optional(),

  // TODO: Добавить опцию "Создать как завершенный" (только для создания)
  // createAsCompleted: z.boolean().optional(),
});

// Определяем тип данных формы, включая опциональные поля из формы
export type PaymentFormInputs = z.infer<typeof paymentFormSchema> & {
  // createAsCompleted?: boolean; // Добавляем опцию, если она будет в форме
};

interface PaymentFormProps {
  paymentId?: string;
  onSuccess: (newPaymentId?: string) => void; // Добавили опциональный newPaymentId в onSuccess для создания
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  paymentId,
  onSuccess,
  onCancel,
}) => {
  const isEditMode = !!paymentId;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    clearErrors, // Для очистки ошибок при изменении зависимых полей
  } = useForm<PaymentFormInputs>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      title: "",
      amount: undefined,
      dueDate: isEditMode ? undefined : new Date(), // Default to current date in create mode
      categoryId: null,
      isRecurrent: false, // !!! Начальное значение для чекбокса
      recurrencePattern: null, // !!! Начальное значение
      recurrenceEndDate: null, // !!! Начальное значение
    },
  });

  const watchDueDate = watch("dueDate");
  const watchCategoryId = watch("categoryId");
  // !!! Отслеживаем поля рекуррентности
  const watchIsRecurrent = watch("isRecurrent");
  const watchRecurrencePattern = watch("recurrencePattern");
  const watchRecurrenceEndDate = watch("recurrenceEndDate");

  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [attachedFile, setAttachedFile] = useState<{
    filePath: string;
    fileName: string;
  } | null>(null);

  // !!! Состояние для хранения выбранной/загруженной иконки
  const [selectedIcon, setSelectedIcon] = useState<PaymentIconInfo | null>(
    null
  );

  // !!! Состояние для опции "Создать как завершенный" (только для создания)
  const [createAsCompleted, setCreateAsCompleted] = useState(false);

  // Эффект для загрузки данных платежа (для редактирования) И категорий
  useEffect(() => {
    // fetchCategories(); // Moved to PaymentCategorySelect

    if (isEditMode && paymentId) {
      const fetchPayment = async () => {
        try {
          const res = await axiosInstance.get(`/payments/${paymentId}`);
          const paymentData = res.data;

          reset({
            title: paymentData.title,
            amount: parseFloat(paymentData.amount),
            dueDate: new Date(paymentData.dueDate),
            categoryId: paymentData.category?.id || "",
            // !!! Заполняем поля рекуррентности
            isRecurrent: paymentData.isRecurrent || false,
            recurrencePattern: paymentData.recurrencePattern || null, // Может быть null
            recurrenceEndDate: paymentData.recurrenceEndDate
              ? new Date(paymentData.recurrenceEndDate)
              : null, // Может быть null
            // TODO: Заполнить другие поля
          });

          // Устанавливаем состояние прикрепленного файла
          if (paymentData.filePath && paymentData.fileName) {
            setAttachedFile({
              filePath: paymentData.filePath,
              fileName: paymentData.fileName,
            });
          } else {
            setAttachedFile(null);
          }

          // Устанавливаем состояние выбранной/загруженной иконки
          if (paymentData.iconType) {
            setSelectedIcon({
              iconType: paymentData.iconType,
              builtinIconName: paymentData.builtinIconName,
              iconPath: paymentData.iconPath,
            });
          } else {
            setSelectedIcon(null);
          }

          setIsLoading(false);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof AxiosError && error.response?.data?.message
              ? error.response.data.message
              : error instanceof Error
              ? error.message
              : "Не удалось загрузить данные платежа.";
          logger.error(
            `Failed to fetch payment ${paymentId}:`,
            errorMessage,
            error
          );
          setFormError(errorMessage);
          setIsLoading(false);
        }
      };
      fetchPayment();
    } else {
      // Режим создания - сбрасываем файл и иконку, isLoading платежа неактивен
      // setAttachedFile(null); // Moved to PaymentFileUploadSection
      setSelectedIcon(null);
      setIsLoading(false);
      // В режиме создания сбрасываем опцию "Создать как завершенный"
      setCreateAsCompleted(false);
    }
    // reset добавляется в зависимости, т.к. используется с внешними данными (paymentData)
  }, [paymentId, isEditMode, reset, setValue]); // Removed fetchCategories dependency

  // !!! Эффект для условной валидации полей рекуррентности (Moved to PaymentRecurrenceSection)
  // If isRecurrent false, reset pattern and endDate and clear related errors
  // useEffect(() => {
  //   if (!watchIsRecurrent) {
  //     setValue("recurrencePattern", null);
  //     setValue("recurrenceEndDate", null);
  //     clearErrors(["recurrencePattern", "recurrenceEndDate"]); // Очищаем ошибки для этих полей
  //   }
  // }, [watchIsRecurrent, setValue, clearErrors]);

  // Обработчик отправки формы
  const onSubmit: SubmitHandler<PaymentFormInputs> = async (data) => {
    setFormError(null);

    // Валидация на Frontend должна также учитывать зависимости:
    // Если isRecurrent true, pattern должен быть выбран. Zod схема уже это делает с nullable().optional() и enum.
    // Если isRecurrent true и pattern выбран, endDate может быть null или Date.

    const finalPayload = {
      ...data,
      amount: Number(data.amount),
      dueDate: data.dueDate
        ? `${data.dueDate.getFullYear()}-${String(
            data.dueDate.getMonth() + 1
          ).padStart(2, "0")}-${String(data.dueDate.getDate()).padStart(
            2,
            "0"
          )}`
        : null,
      categoryId: data.categoryId === "" ? null : data.categoryId,
      isRecurrent: data.isRecurrent || false,
      recurrencePattern: data.isRecurrent ? data.recurrencePattern : null,
      recurrenceEndDate:
        data.isRecurrent && data.recurrenceEndDate
          ? data.recurrenceEndDate.toISOString().split("T")[0]
          : null,
      iconType: selectedIcon?.iconType || null,
      builtinIconName: selectedIcon?.builtinIconName || null,
      iconPath: selectedIcon?.iconPath || null,
      ...(isEditMode ? {} : { createAsCompleted: createAsCompleted }),
    };

    try {
      if (isEditMode && paymentId) {
        await axiosInstance.put(`/payments/${paymentId}`, finalPayload);
        logger.info(`Payment updated (ID: ${paymentId})`);
        onSuccess(paymentId); // Вызываем onSuccess, передавая ID
      } else {
        const res = await axiosInstance.post("/payments", finalPayload);
        const newPaymentId = res.data.id; // Получаем ID нового платежа
        logger.info("Payment created", res.data);
        // Теперь, если пользователь выбрал файл или пользовательскую иконку в форме создания,
        // эти компоненты (FileUpload, IconPicker) ДОЛЖНЫ начать загрузку, используя newPaymentId.
        // Но они активны, только если paymentId передан.
        // Это означает, что после POST запроса создания, нужно ПЕРЕДАТЬ newPaymentId в эти компоненты.
        // Либо изменить flow, как описано выше (открывать форму редактирования после создания).
        // Придерживаемся второго варианта: после создания, модалка не закрывается, а форма переходит в режим редактирования нового платежа.

        // Скорректируем onSuccess: он должен принимать ID нового платежа.
        onSuccess(newPaymentId); // Вызываем onSuccess, передавая ID нового платежа

        // ИЛИ, если модалка закрывается сразу:
        // onSuccess(); // Просто закрываем модалку
        // И тогда пользователь открывает платеж для редактирования, чтобы прикрепить файл/иконку.
        // Это проще. Давайте пока так. Сделаем onSuccess без аргументов.

        onSuccess(); // Просто закрываем модалку и обновляем список родительским компонентом
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
          ? error.message
          : "Произошла ошибка при сохранении.";
      logger.error("Failed to save payment:", errorMessage, error);
      setFormError(errorMessage);
    }
  };

  // !!! Обработчик изменения иконки из IconPicker (обновляет локальное состояние иконки)
  const handleIconChange = useCallback((iconInfo: PaymentIconInfo | null) => {
    setSelectedIcon(iconInfo);
    setFormError(null); // Сбрасываем ошибку формы, если она пришла от IconPicker
  }, []);

  // !!! Обработчик ошибки из FileUpload ИЛИ IconPicker
  const handleFileUploadError = useCallback((message: string) => {
    setFormError(`Ошибка: ${message}`);
  }, []);

  if (isLoading) {
    // Only check for main form loading
    return (
      <div className="text-center dark:text-gray-200">Загрузка формы...</div>
    );
  }

  // Обработка ошибок загрузки данных (only main form error)
  if (formError && isLoading === false && isEditMode) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
        role="alert"
      >
        <span className="block sm:inline">{formError}</span>
        <div className="mt-2 text-center">
          <button
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ... Заголовок, общая ошибка формы ... */}
      <h2 className="text-2xl font-bold text-center mb-4 dark:text-gray-100">
        {isEditMode ? "Редактировать платеж" : "Добавить платеж"}
      </h2>
      {formError && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <span className="block sm:inline">{formError}</span>
        </div>
      )}

      {/* Поля: Название, Сумма, Срок оплаты */}
      <PaymentDetailsSection
        register={register}
        errors={errors}
        setValue={setValue}
        watchDueDate={watchDueDate}
        isSubmitting={isSubmitting}
      />
      {/* Поле: Категория */}
      <PaymentCategorySelect
        register={register}
        errors={errors}
        setValue={setValue}
        watchCategoryId={watchCategoryId}
        isSubmitting={isSubmitting}
      />

      {/* !!! Секция рекуррентности !!! */}
      <PaymentRecurrenceSection
        register={register}
        errors={errors}
        setValue={setValue}
        watchIsRecurrent={watchIsRecurrent}
        watchRecurrencePattern={watchRecurrencePattern}
        watchRecurrenceEndDate={watchRecurrenceEndDate}
        isSubmitting={isSubmitting}
        clearErrors={clearErrors}
      />

      {/* Компонент IconPicker */}
      <IconPicker
        paymentId={paymentId} // ID платежа (undefined при создании)
        initialIcon={selectedIcon} // Текущая иконка
        onIconChange={handleIconChange} // Обработчик изменения иконки
        onError={handleFileUploadError} // Обработчик ошибок
        isFormSubmitting={isSubmitting} // Статус отправки формы
      />

      {/* Компонент FileUpload */}
      <PaymentFileUploadSection
        paymentId={paymentId} // ID платежа (undefined при создании)
        initialFile={attachedFile} // Начальное состояние файла (null при создании)
        isSubmitting={isSubmitting} // Pass isSubmitting
        setFormError={setFormError} // Pass form error setter
      />

      {/* !!! Опция "Создать как завершенный" (только для режима создания) */}
      {!isEditMode && (
        <div className="flex items-center">
          <input
            id="createAsCompleted"
            type="checkbox"
            checked={createAsCompleted} // Управляется локальным состоянием
            onChange={(e) => setCreateAsCompleted(e.target.checked)}
            className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
            disabled={isSubmitting}
          />
          <label
            htmlFor="createAsCompleted"
            className="ml-2 block text-sm text-gray-900 dark:text-gray-100"
          >
            Создать как выполненный
          </label>
        </div>
      )}

      {/* Кнопки формы */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
          disabled={isSubmitting}
        >
          Отмена
        </button>
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Сохранение..."
            : isEditMode
            ? "Сохранить изменения"
            : "Добавить платеж"}
        </button>
      </div>
    </form>
  );
};

export default PaymentForm;
