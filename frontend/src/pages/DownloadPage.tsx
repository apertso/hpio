import React from "react";
import {
  ArrowDownTrayIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../components/Button";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";

const DownloadCard = ({
  title,
  description,
  downloadUrl,
  recommended = false,
}: {
  title: string;
  description: string;
  downloadUrl: string;
  recommended?: boolean;
}) => (
  <div
    className={`relative p-6 rounded-xl border-2 transition-all hover:shadow-lg ${
      recommended
        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400"
        : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700"
    }`}
  >
    {recommended && (
      <div className="absolute -top-3 left-4 px-3 py-1 text-xs font-semibold text-white bg-indigo-500 rounded-full">
        Рекомендуется
      </div>
    )}
    <div className="flex items-center gap-4 mb-4">
      <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
        <DevicePhoneMobileIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
          {description}
        </p>
      </div>
    </div>
    <a
      href={downloadUrl}
      className="block"
      download
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button
        label="Скачать"
        icon={<ArrowDownTrayIcon className="w-5 h-5" />}
        className={`w-full justify-center ${
          !recommended ? "bg-slate-600 hover:bg-slate-700" : ""
        }`}
      />
    </a>
  </div>
);

const DownloadPage: React.FC = () => {
  const metadata = getPageMetadata("download");

  return (
    <>
      <PageMeta {...metadata} />

      <div className="w-full max-w-4xl mx-auto text-gray-900 dark:text-gray-100">
        {/* Header Section */}
        <section className="py-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            Скачать приложение
          </h1>
          <p className="max-w-2xl mx-auto mt-6 text-lg text-gray-600 dark:text-gray-300">
            Управляйте своими финансами где угодно с мобильным приложением Хочу
            Плачу
          </p>
        </section>

        {/* Android Section */}
        <section className="py-8">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold mb-2">Android</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Выберите подходящую версию для вашего устройства
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* ARM64 Version */}
            <DownloadCard
              title="Скачать для arm64"
              description="Быстрая и легкая версия для современных устройств"
              downloadUrl="https://cdn.hpio.ru/releases/0.0.9/app-arm64-release.apk"
              recommended={true}
            />

            {/* Universal Version */}
            <DownloadCard
              title="Скачать Universal"
              description="Резервный вариант, если первая версия не установилась"
              downloadUrl="https://cdn.hpio.ru/releases/0.0.9/app-universal-release.apk"
            />
          </div>

          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Рекомендация:</strong> Сначала попробуйте версию ARM64.
              Если она не установится или не запустится, тогда скачайте
              универсальную версию.
            </p>
          </div>
        </section>

        {/* Coming Soon Section */}
        <section className="py-12">
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Скоро</h2>
            <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
              <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700">
                  <svg
                    className="w-6 h-6 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5M13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">iOS</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Версия для iPhone и iPad в разработке
                </p>
              </div>

              <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700">
                  <svg
                    className="w-6 h-6 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3,12V6.75L9,5.43V11.91L3,12M20,3V11.75L10,11.9V5.21L20,3M3,13L9,13.09V19.9L3,18.75V13M20,13.25V22L10,20.09V13.1L20,13.25Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Windows</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Настольное приложение для Windows
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Installation Instructions */}
        <section className="py-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">
              Инструкция по установке
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li>Скачайте APK-файл, нажав на кнопку "Скачать"</li>
              <li>
                Откройте настройки Android и разрешите установку из неизвестных
                источников
              </li>
              <li>
                Найдите скачанный файл в папке "Загрузки" и нажмите на него
              </li>
              <li>Следуйте инструкциям на экране для завершения установки</li>
            </ol>
          </div>
        </section>
      </div>
    </>
  );
};

export default DownloadPage;
