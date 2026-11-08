import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  CodeBracketIcon,
  EnvelopeIcon,
  PaperClipIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { submitFeedback } from "../api/feedbackApi";
import { Button } from "../components/Button";
import { EmailField, TextInputField } from "../components/Input";
import PageMeta from "../components/PageMeta";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { getPageMetadata } from "../utils/pageMetadata";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORT_EMAIL = "support@hpio.ru";
const contactActionClassName =
  "w-full cursor-pointer items-center gap-3 py-3 text-left text-gray-900 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-gray-100";

const feedbackSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя"),
  email: z.string().trim().email("Проверьте адрес почты"),
  message: z.string().trim().min(10, "Напишите хотя бы 10 символов"),
  attachment: z.instanceof(FileList).optional().refine(
    (files) => !files?.[0] || files[0].size < MAX_FILE_SIZE,
    "Выберите файл размером меньше 5 МБ"
  ),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

const supportLinks = [
  {
    href: `mailto:${SUPPORT_EMAIL}`,
    label: SUPPORT_EMAIL,
    description: "Вопросы об аккаунте",
    icon: EnvelopeIcon,
  },
  {
    href: "https://github.com/apertso/hpio/issues",
    label: "GitHub Issues",
    description: "Сообщить об ошибке",
    icon: CodeBracketIcon,
  },
  {
    href: "https://www.linkedin.com/in/artur-pertsev/",
    label: "LinkedIn",
    description: "Деловые вопросы",
    icon: UserIcon,
  },
];

const AboutPage = (): ReactElement => {
  const { t } = useLanguage();
  const { isAuthenticated, loading } = useAuth();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"sent" | "queued" | "error" | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
    reset,
    resetField,
    setFocus,
    watch,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    mode: "onChange",
    delayError: 1000,
  });

  const nameField = register("name");
  const emailField = register("email");
  const messageField = register("message");
  const attachmentField = register("attachment");
  const attachment = watch("attachment")?.[0];

  const onSubmit = async (data: FeedbackFormData): Promise<void> => {
    setSubmitStatus(null);
    try {
      const description = `Имя: ${data.name}\nEmail: ${data.email}\n\nСообщение:\n${data.message}`;
      const sent = await submitFeedback(description, data.attachment?.[0]);
      reset();
      setSubmitStatus(sent ? "sent" : "queued");
    } catch {
      setSubmitStatus("error");
    }
  };

  const statusMessage = {
    sent: t("Спасибо! Сообщение отправлено."),
    queued: t("Сообщение отправится после восстановления связи."),
    error: t("Не удалось отправить сообщение. Попробуйте ещё раз."),
  };

  const feedbackTitle = t("Обратная связь");
  const feedbackRow = (
    <>
      <ChatBubbleLeftRightIcon aria-hidden="true" className="size-5 shrink-0 text-gray-500 dark:text-gray-400" />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{feedbackTitle}</span>
        <span className="block text-base font-normal text-gray-600 dark:text-gray-400">
          {t("Расскажите, что можно улучшить, или опишите проблему.")}
        </span>
      </span>
    </>
  );

  return (
    <>
      <PageMeta {...getPageMetadata("about")} />

      <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-9 px-4 py-9 sm:px-8 sm:py-14 lg:py-18 selection:bg-indigo-100 selection:text-indigo-950 dark:selection:bg-indigo-800 dark:selection:text-white">
        <header>
          <h1 className="flex items-center gap-3 text-4xl font-bold tracking-[-0.03em] text-gray-950 dark:text-white sm:gap-4 sm:text-6xl">
            <img
              src="/icons/favicon.svg"
              alt=""
              width={48}
              height={48}
              className="size-10 shrink-0 rounded-xl border border-gray-200 sm:size-12 dark:border-gray-700"
            />
            <span>{t("О сервисе")}</span>
          </h1>
          <p className="mt-4 max-w-[55ch] text-xl leading-relaxed text-gray-800 dark:text-gray-200">
            <strong className="font-semibold">{t("Хочу Плачу")}</strong>{t(" помогает планировать разовые и регулярные платежи, получать напоминания и отслеживать расходы.")}
          </p>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-gray-600 dark:text-gray-400">
            {t("Сервис подходит для личного и семейного бюджета, фриланса и малого бизнеса. История платежей и аналитика помогают понять, на что уходят деньги.")}
          </p>
        </header>

        <section aria-labelledby="about-support-title">
          <h2 id="about-support-title" className="mb-3 text-xl font-semibold text-gray-950 dark:text-white">
            {t("Контакты")}
          </h2>
          <ul className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-700 dark:border-gray-700">
            {supportLinks.map(({ href, label, description, icon: Icon }) => {
              const external = href.startsWith("https:");
              return (
                <li key={href}>
                  <a
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className={`flex ${contactActionClassName}`}
                  >
                    <Icon aria-hidden="true" className="size-5 shrink-0 text-gray-500 dark:text-gray-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold">{label}</span>
                      <span className="block text-base text-gray-600 dark:text-gray-400">{t(description)}</span>
                    </span>
                    {external && (
                      <ArrowTopRightOnSquareIcon aria-hidden="true" className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
                    )}
                  </a>
                </li>
              );
            })}
            <li>
              <h3 aria-label={feedbackTitle} className="text-gray-900 dark:text-gray-100">
                <span className="flex items-center gap-3 py-3 md:hidden">{feedbackRow}</span>
                <button
                  type="button"
                  aria-label={feedbackTitle}
                  aria-expanded={isFeedbackOpen}
                  aria-controls="about-feedback-body"
                  onClick={() => setIsFeedbackOpen((open) => !open)}
                  className={`group hidden md:flex ${contactActionClassName}`}
                >
                  {feedbackRow}
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-gray-500 group-aria-expanded:rotate-180 motion-safe:transition-transform dark:text-gray-400"
                  />
                </button>
              </h3>
              <div
                id="about-feedback-body"
                className={`border-t border-gray-200 py-4 dark:border-gray-700 md:pl-8 ${isFeedbackOpen ? "" : "md:hidden"}`}
              >
                {isAuthenticated ? (
                  <form noValidate onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
                    <fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
                      <div className="space-y-5 [&_label]:text-base [&_input]:border-gray-500 [&_input[aria-invalid=true]]:border-red-600 [&_p]:text-base [&_p]:text-red-700 dark:[&_input]:border-gray-400 dark:[&_input[aria-invalid=true]]:border-red-400 dark:[&_p]:text-red-300">
                        <TextInputField
                          label={t("Имя")}
                          inputId="feedback-name"
                          autoComplete="name"
                          className="min-w-0"
                          error={errors.name?.message}
                          required
                          {...nameField}
                          onChange={(event) => {
                            clearErrors("name");
                            void nameField.onChange(event);
                          }}
                        />
                        <EmailField
                          label={t("Электронная почта")}
                          inputId="feedback-email"
                          autoComplete="email"
                          className="min-w-0"
                          error={errors.email?.message}
                          required
                          {...emailField}
                          onChange={(event) => {
                            clearErrors("email");
                            void emailField.onChange(event);
                          }}
                        />
                      </div>

                      <div>
                        <label htmlFor="feedback-message" className="mb-1.5 block text-base font-medium text-gray-700 dark:text-gray-200">
                          {t("Сообщение")}
                        </label>
                        <textarea
                          id="feedback-message"
                          rows={5}
                          required
                          aria-invalid={Boolean(errors.message)}
                          aria-describedby={errors.message ? "feedback-message-error" : undefined}
                          className={`block w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-base leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-gray-100 ${
                            errors.message ? "border-red-600 dark:border-red-400" : "border-gray-500 dark:border-gray-400"
                          }`}
                          {...messageField}
                          onChange={(event) => {
                            clearErrors("message");
                            void messageField.onChange(event);
                          }}
                        />
                        {errors.message && (
                          <p id="feedback-message-error" className="mt-1.5 text-base text-red-700 dark:text-red-300">
                            {t(errors.message.message ?? "")}
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <label className="relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2.5 text-base font-medium text-indigo-700 transition-all hover:bg-indigo-50 hover:opacity-80 focus-within:outline-2 focus-within:outline-indigo-500 dark:text-indigo-300 dark:hover:bg-gray-700">
                            <PaperClipIcon aria-hidden="true" className="size-5 shrink-0" />
                            {attachment ? t("Заменить файл") : t("Прикрепить файл")}
                            <input
                              type="file"
                              className="absolute inset-0 size-full cursor-pointer opacity-0"
                              aria-invalid={Boolean(errors.attachment)}
                              aria-describedby={errors.attachment ? "feedback-file-error" : "feedback-file-hint"}
                              {...attachmentField}
                              onChange={(event) => {
                                clearErrors("attachment");
                                void attachmentField.onChange(event);
                              }}
                            />
                          </label>
                          <span id="feedback-file-hint" className="text-base text-gray-600 dark:text-gray-300">
                            {t("Необязательно, меньше 5 МБ")}
                          </span>
                        </div>
                        {attachment && (
                          <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-50 py-1 pr-1 pl-3 dark:bg-gray-900" aria-live="polite">
                            <span className="min-w-0 flex-1 text-base break-all text-gray-800 dark:text-gray-100">
                              {attachment.name}
                            </span>
                            <button
                              type="button"
                              aria-label={t("Убрать вложение")}
                              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-gray-600 transition-all hover:bg-gray-200 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-gray-300 dark:hover:bg-gray-700"
                              onClick={() => {
                                resetField("attachment");
                                setFocus("attachment");
                              }}
                            >
                              <XMarkIcon aria-hidden="true" className="size-5" />
                            </button>
                          </div>
                        )}
                        {errors.attachment && (
                          <p id="feedback-file-error" role="alert" className="mt-2 text-base text-red-700 dark:text-red-300">
                            {t(errors.attachment.message ?? "")}
                          </p>
                        )}
                      </div>
                    </fieldset>

                    <div className="mt-5 flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-gray-700 sm:flex-row sm:items-center">
                      <p
                        role="status"
                        className={submitStatus
                          ? `text-base ${submitStatus === "error"
                            ? "text-red-700 dark:text-red-300"
                            : "text-gray-700 dark:text-gray-200"}`
                          : "sr-only"}
                      >
                        {submitStatus && statusMessage[submitStatus]}
                      </p>
                      <Button
                        type="submit"
                        size="large"
                        className="w-full sm:ml-auto sm:w-auto sm:shrink-0"
                        loading={isSubmitting}
                        label={isSubmitting ? t("Отправляем…") : t("Отправить сообщение")}
                      />
                    </div>
                  </form>
                ) : !loading && (
                  <div>
                    <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300">
                      {t("Войдите, чтобы отправить сообщение и прикрепить файл. Без аккаунта можно написать на")}{" "}
                      <a
                        href={`mailto:${SUPPORT_EMAIL}`}
                        className="cursor-pointer text-indigo-700 underline underline-offset-2 transition-opacity hover:opacity-80 dark:text-indigo-300"
                      >
                        {t("почту поддержки")}
                      </a>
                      .
                    </p>
                    <Link to="/login" className="mt-3 inline-flex min-h-11 cursor-pointer items-center font-semibold text-indigo-700 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-300">
                      {t("Войти в аккаунт")}
                    </Link>
                  </div>
                )}
              </div>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
};

export default AboutPage;
