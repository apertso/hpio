import React, { useState } from "react";
import Modal from "./Modal";
import { Button } from "./Button";
import Spinner from "./Spinner";
import { useToast } from "../context/ToastContext";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitFeedback } from "../api/feedbackApi";
import { ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/24/outline";
import MobilePanel from "./MobilePanel";
import { Input } from "./Input";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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
    } catch {
      showToast("Не удалось отправить.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = (wrapperClassName = "") => (
    <div className={wrapperClassName}>
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
          <Input
            type="file"
            accept="*/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              if (f && f.size > MAX_FILE_SIZE) {
                showToast("Размер файла превышает 5 МБ.", "error");
                e.currentTarget.value = "";
                setFile(null);
                return;
              }
              setFile(f);
            }}
            className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-slate-700 dark:file:text-slate-200 dark:hover:file:bg-slate-600 dark:hover:file:text-white"
            unstyled
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" /> : "Отправить"}
          </Button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative inline-flex items-center gap-2 p-2 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 transition-colors focus:outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="Открыть форму отзыва"
        title="Оставить отзыв"
      >
        <span className="feedback-ripple"></span>
        <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5 text-gray-500/80 dark:text-gray-300/80" />
      </button>

      {isOpen && (
        <>
          <Modal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="Оставить отзыв"
            className="hidden md:flex"
          >
            {renderForm()}
          </Modal>
          <MobilePanel
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="Оставить отзыв"
            showCloseButton
          >
            {renderForm("mt-2")}
          </MobilePanel>
        </>
      )}
    </>
  );
};

export default FeedbackWidget;
