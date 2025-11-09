import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitFeedback } from "../api/feedbackApi";
import { useToast } from "../context/ToastContext";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import {
  PaperAirplaneIcon,
  UserIcon,
  CodeBracketIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

const feedbackSchema = z.object({
  name: z.string().min(1, "Имя обязательно"),
  email: z.string().email("Некорректный email"),
  message: z.string().min(10, "Сообщение должно содержать минимум 10 символов"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

const AboutPage: React.FC = () => {
  const metadata = getPageMetadata("about");
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
  });

  const onSubmit = async (data: FeedbackFormData) => {
    try {
      setIsSubmitting(true);
      // Combine name and email with the message for the feedback API
      const feedbackMessage = `Имя: ${data.name}\nEmail: ${data.email}\n\nСообщение:\n${data.message}`;
      await submitFeedback(feedbackMessage);
      showToast(
        "Спасибо за ваше предложение! Мы обязательно рассмотрим его в ближайшее время.",
        "success"
      );
      reset();
    } catch {
      showToast("Не удалось отправить сообщение. Попробуйте еще раз.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta {...metadata} />

      <section className="w-full max-w-4xl mx-auto py-12 px-6 sm:px-8 lg:px-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-10">
        <div className="prose dark:prose-invert max-w-none">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <img
                src="/icons/android-chrome-192x192.png"
                alt="Хочу Плачу логотип"
                className="w-20 h-20 rounded-2xl shadow-md"
              />
            </div>
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
              О сервисе
            </h1>
          </div>

          <div className="space-y-6 text-lg leading-relaxed">
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Хочу Плачу</strong> - это сервис для управления разовыми и
              регулярными платежами. Он помогает отслеживать расходы, получать
              напоминания и анализировать финансовую активность в удобном
              формате.
            </p>

            <p className="text-gray-700 dark:text-gray-300">
              Данный проект это простой и надежный инструмент для управления
              финансами который может быть полезен семьям, фрилансерам, малому
              бизнесу и тем, кто хочет сделать планирование личных финансов
              проще.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Feedback Form */}
              <div className="lg:col-span-2">
                <h2 className="text-xl md:text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                  Ваши предложения
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Поделитесь своими идеями и предложениями.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Имя
                    </label>
                    <input
                      {...register("name")}
                      type="text"
                      id="name"
                      className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.name
                          ? "border-red-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder=""
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Email
                    </label>
                    <input
                      {...register("email")}
                      type="email"
                      id="email"
                      className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email
                          ? "border-red-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder=""
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Ваше предложение
                    </label>
                    <textarea
                      {...register("message")}
                      id="message"
                      rows={4}
                      className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                        errors.message
                          ? "border-red-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder=""
                    />
                    {errors.message && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Отправляется...</span>
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4" />
                        <span>Отправить</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Support Options */}
              <div className="lg:col-span-1">
                <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                  Поддержка
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Свяжитесь с нами:
                </p>

                <div className="space-y-4">
                  <a
                    href="https://www.linkedin.com/in/artur-pertsev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:opacity-80 transition-opacity"
                  >
                    <div className="flex-shrink-0">
                      <UserIcon className="w-6 h-6 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        LinkedIn
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Деловые вопросы
                      </p>
                    </div>
                  </a>

                  <a
                    href="https://github.com/apertso/hpio/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:opacity-80 transition-opacity"
                  >
                    <div className="flex-shrink-0">
                      <CodeBracketIcon className="w-6 h-6 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        GitHub Issues
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Сообщить об ошибке
                      </p>
                    </div>
                  </a>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      По вопросам аккаунта:
                    </p>
                    <a
                      href="mailto:support@hpio.ru"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 transition-colors font-medium"
                    >
                      <EnvelopeIcon className="w-4 h-4" />
                      <span>support@hpio.ru</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AboutPage;
