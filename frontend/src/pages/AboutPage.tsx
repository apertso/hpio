import React from "react";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";

const AboutPage: React.FC = () => {
  const metadata = getPageMetadata("about");

  return (
    <>
      <PageMeta {...metadata} />

      <section className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg mb-10">
        <div className="prose dark:prose-invert max-w-none">
          <h1 className="text-2xl font-bold mb-4">О проекте</h1>

          <div className="flex items-center gap-6 mb-6">
            <img
              src="/me.png"
              alt="Artur Pertsev profile"
              className="w-24 h-24 rounded-full ring-2 ring-blue-400/30 shadow-sm"
            />
            <div>
              <h2 className="text-xl font-bold mb-2">
                <strong>Меня зовут Артур Перцев</strong>
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-0">
                Full-stack разработчик и solopreneur
              </p>
            </div>
          </div>
          <p>
            <strong>«Хочу Плачу»</strong> - это сервис для управления платежами,
            который я разработал в одиночку. Мне захотелось иметь удобный
            инструмент для управления своими финансами - и так пришла идея
            создать такой инструмент с использованием AI.
          </p>
          <h3>Есть идея? Связаться со мной можно через:</h3>
          <ul className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <li>
              <a
                href="https://www.linkedin.com/in/artur-pertsev/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-blue-500 hover:text-blue-600 border border-transparent hover:border-blue-500/40 hover:bg-blue-500/10 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 mt-[-0.35rem]"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M4.98 3.5c0 1.38-1.11 2.5-2.48 2.5S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4v16h-4V8zm8 0h3.8v2.16h.05c.53-1 1.82-2.16 3.74-2.16 4 0 4.74 2.63 4.74 6.05V24h-4V15.3c0-2.07-.04-4.74-2.88-4.74-2.88 0-3.32 2.25-3.32 4.58V24h-4V8z" />
                </svg>
                <span>LinkedIn</span>
              </a>
            </li>
            <li>
              <a
                href="https://t.me/apertso"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-blue-500 hover:text-blue-600 border border-transparent hover:border-blue-500/40 hover:bg-blue-500/10 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M22 2L2.9 10.1c-.9.4-.9 1.1-.1 1.4l4.9 1.5 1.8 5.6c.2.6.8.8 1.3.3l2.6-2.2 4.9 3.6c.6.4 1.2.2 1.4-.6L24 3.3C24 2.4 23.1 1.9 22 2zM8.6 12.9l9.6-6-7.3 7c-.2.1-.3.3-.2.5l.8 2.6-1.9-4.1c-.1-.1 0-.2.1-.2h-.1z" />
                </svg>
                <span>Telegram</span>
              </a>
            </li>
          </ul>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="mt-0">
              По всем вопросам, связанным с сервисом, пишите на{" "}
              <a
                href="mailto:support@hpio.ru"
                className="text-blue-500 hover:text-blue-600"
              >
                support@hpio.ru
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default AboutPage;
