import React, { useMemo, useState } from "react";
import Modal from "./Modal";
import { Button } from "./Button";
import Spinner from "./Spinner";
import { useToast } from "../context/ToastContext";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitFeedback } from "../api/feedbackApi";
import { ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/24/outline";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const schema = z.object({
  description: z.string().trim().min(1, "Описание обязательно"),
  file: z.any().optional(),
});

type FormValues = z.infer<typeof schema> & { file?: File | null };

const FeedbackWidget: React.FC = () => {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    delayError: 1000,
  });

  const descriptionRegister = register("description");

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      await submitFeedback(values.description, file || undefined);
      showToast(
        "Спасибо за отзыв! Мы обязательно рассмотрим его в ближайшее время.",
        "success"
      );
      reset();
      setFile(null);
      setIsOpen(false);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      showToast("Не удалось отправить.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4"></p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label
            htmlFor="feedback-description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
          >
            Опишите проблему
          </label>
          <textarea
            id="feedback-description"
            className={`block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 ${
              errors.description ? "border-red-500 dark:border-red-500" : ""
            }`}
            rows={4}
            placeholder=""
            {...descriptionRegister}
            onChange={(e) => {
              descriptionRegister.onChange(e);
            }}
          />
          {errors.description?.message && (
            <p className="text-red-500 text-sm mt-1">
              {errors.description.message}
            </p>
          )}
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Прикрепить файл (до 5 МБ)
          </label>
          <input
            type="file"
            accept="*/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              if (f && f.size > MAX_FILE_SIZE) {
                // ограничение размера файла
                showToast("Размер файла превышает 5 МБ.", "error");
                e.currentTarget.value = "";
                setFile(null);
                return;
              }
              setFile(f);
            }}
            className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-slate-700 dark:file:text-slate-200 dark:hover:file:bg-slate-600 dark:hover:file:text-white"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" /> : "Отправить"}
          </Button>
        </div>
      </form>
    </>
  );

  return (
    <>
      {/* компактная кнопка в футере с иконкой и подписью */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative inline-flex items-center gap-2 px-2 py-1 rounded-md text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white focus:outline-none"
        aria-label="Открыть форму отзыва"
        title="Оставить отзыв"
      >
        <span className="feedback-ripple"></span>
        <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5 text-gray-500/80 dark:text-gray-300/80" />
      </button>

      {isMobile ? (
        // Мобильная панель снизу
        isOpen ? (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-0 right-0 bottom-0 bg-white dark:bg-gray-900 rounded-t-xl shadow-xl p-5 max-h-[85vh] overflow-y-auto translate-y-0 transition-transform">
              <div className="flex justify-center mb-3">
                <div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
              </div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Оставить отзыв
                </div>
                <button
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => setIsOpen(false)}
                  aria-label="Закрыть"
                >
                  ×
                </button>
              </div>
              {formContent}
            </div>
          </div>
        ) : null
      ) : (
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Оставить отзыв"
        >
          {formContent}
        </Modal>
      )}
    </>
  );
};

export default FeedbackWidget;
