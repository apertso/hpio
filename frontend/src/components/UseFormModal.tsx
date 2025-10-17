import { ReactNode, useEffect } from "react";
import {
  useForm,
  UseFormReturn,
  SubmitHandler,
  FieldValues,
  DefaultValues,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodSchema } from "zod";
import Modal from "./Modal";
import Spinner from "./Spinner";
import MobilePanel from "./MobilePanel";

interface UseFormModalProps<T extends FieldValues> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  schema: ZodSchema<T>;
  onSubmit: SubmitHandler<T>;
  defaultValues?: DefaultValues<T>;
  children: (methods: UseFormReturn<T, unknown, T>) => ReactNode;
  isSubmitting?: boolean;
  formError?: string | null;
}

function UseFormModal<T extends FieldValues>({
  isOpen,
  onClose,
  title,
  schema,
  onSubmit,
  defaultValues,
  children,
  isSubmitting: externalIsSubmitting = false,
  formError: externalFormError = null,
}: UseFormModalProps<T>) {
  const methods = useForm<T, unknown, T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting: internalIsSubmitting, errors },
    reset,
  } = methods;

  const isSubmitting = internalIsSubmitting || externalIsSubmitting;

  const formError =
    externalFormError ||
    (Object.keys(errors).length > 0 ? "Validation errors occurred." : null);

  useEffect(() => {
    if (!isOpen) {
      reset(defaultValues);
    } else if (defaultValues) {
      reset(defaultValues);
    }
  }, [isOpen, reset, defaultValues]);

  if (!isOpen) return null;

  const renderForm = (additionalClasses = "") => (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 ${additionalClasses}`}>
      {formError && (
        <div
          className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <span className="block sm:inline">{formError}</span>
        </div>
      )}

      {children(methods)}

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 dark:hover:bg-gray-500 transition-colors duration-200 cursor-pointer"
          disabled={isSubmitting}
        >
          Отмена
        </button>
        <button
          type="submit"
          className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-28 cursor-pointer"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner size="sm" /> : "Сохранить"}
        </button>
      </div>
    </form>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={title} className="hidden md:flex">
        {renderForm()}
      </Modal>
      <MobilePanel
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        showCloseButton
      >
        {renderForm("mt-2")}
      </MobilePanel>
    </>
  );
}

export default UseFormModal;
