import React from "react";
import {
  ArrowDownTrayIcon,
  DevicePhoneMobileIcon,
  CpuChipIcon,
  ArchiveBoxIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../components/Button";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";

const APP_VERSION = import.meta.env.VITE_APP_VERSION || "0.6.0";

const DownloadCard = ({
  title,
  subtitle,
  description,
  downloadUrl,
  recommended = false,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  description: string;
  downloadUrl: string;
  recommended?: boolean;
  icon: React.ElementType;
}) => (
  <div
    className={`relative flex flex-col p-6 rounded-2xl transition-all duration-300 ${
      recommended
        ? "bg-white dark:bg-gray-800 border-2 border-indigo-600 shadow-xl shadow-indigo-500/10 scale-[1.02] z-10"
        : "bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
    }`}
  >
    {recommended && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
        Рекомендуется
      </div>
    )}

    <div className="flex items-start justify-between mb-4">
      <div
        className={`p-3 rounded-xl ${
          recommended
            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
            : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
        }`}
      >
        <Icon className="w-8 h-8" />
      </div>
      <div className="text-right">
        <span className="block text-xs font-mono text-gray-500 dark:text-gray-400">
          v{APP_VERSION}
        </span>
        <span className="block text-xs font-medium text-green-600 dark:text-green-400">
          Stable
        </span>
      </div>
    </div>

    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2">
      {subtitle}
    </p>
    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 flex-grow leading-relaxed">
      {description}
    </p>

    <a
      href={downloadUrl}
      className="block mt-auto"
      download
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button
        label="Скачать APK"
        icon={<ArrowDownTrayIcon className="w-5 h-5" />}
        variant={recommended ? "primary" : "secondary"}
        className={`w-full justify-center py-3 ${
          !recommended
            ? "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
            : ""
        }`}
      />
    </a>
  </div>
);

const Step = ({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
      {number}
    </div>
    <div>
      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        {title}
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {children}
      </p>
    </div>
  </div>
);

const DownloadPage: React.FC = () => {
  const metadata = getPageMetadata("download");

  return (
    <>
      <PageMeta {...metadata} />

      {/* Removed min-h-screen to prevent layout issues with parent scroll container */}
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 pb-20">
        {/* Hero Header */}
        <section className="relative py-20 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/10 dark:to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center justify-center p-2 mb-6 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
              <DevicePhoneMobileIcon className="w-5 h-5 text-gray-500 mr-2" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 pr-2">
                Android Release
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              Установите{" "}
              <span className="text-indigo-600 dark:text-indigo-400">
                Хочу Плачу
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Полный контроль над финансами без интернета.{" "}
              <br className="hidden sm:inline" />
              Официальные сборки для Android устройств.
            </p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6 -mt-8">
          {/* Download Cards Grid */}
          <div className="grid gap-8 md:grid-cols-2 lg:max-w-4xl lg:mx-auto mb-20">
            {/* ARM64 Version */}
            <DownloadCard
              title="Android ARM64"
              subtitle="Для современных смартфонов"
              description="Оптимизированная 64-битная версия. Лучшая производительность и меньший размер файла. Подходит для большинства устройств, выпущенных после 2016 года."
              downloadUrl={`https://cdn.hpio.ru/releases/${APP_VERSION}/app-arm64-release.apk`}
              icon={CpuChipIcon}
              recommended={true}
            />

            {/* Universal Version */}
            <DownloadCard
              title="Android Universal"
              subtitle="Для старых устройств"
              description="Включает библиотеки для всех архитектур процессоров. Используйте эту версию, если ARM64 не устанавливается или работает некорректно."
              downloadUrl={`https://cdn.hpio.ru/releases/${APP_VERSION}/app-universal-release.apk`}
              icon={ArchiveBoxIcon}
            />
          </div>

          {/* Installation Guide & Info */}
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto items-start">
            {/* Steps */}
            <div>
              <h3 className="text-2xl font-bold mb-8 flex items-center">
                <CheckBadgeIcon className="w-7 h-7 mr-3 text-indigo-600" />
                Как установить
              </h3>
              <div className="space-y-8">
                <Step number="1" title="Скачайте файл">
                  Нажмите кнопку «Скачать» выше. Браузер может предупредить, что
                  файл может быть опасным — это стандартное предупреждение для
                  всех APK не из Google Play.
                </Step>
                <Step number="2" title="Разрешите установку">
                  Откройте скачанный файл. Если система попросит разрешение на
                  установку из неизвестных источников, перейдите в настройки и
                  включите его для вашего браузера или файлового менеджера.
                </Step>
                <Step number="3" title="Готово">
                  После установки иконка появится на главном экране. При первом
                  запуске разрешите приложению отправлять уведомления для
                  корректной работы напоминаний.
                </Step>
              </div>
            </div>

            {/* Security Note */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheckIcon className="w-8 h-8 text-green-600 dark:text-green-500" />
                <h3 className="text-xl font-bold">Безопасность</h3>
              </div>
              <div className="prose prose-sm dark:prose-invert text-gray-600 dark:text-gray-300">
                <p>
                  Мы распространяем приложение напрямую (APK), так как
                  российские финансовые приложения часто удаляются из сторов.
                </p>
                <ul className="mt-4 space-y-2">
                  <li>
                    ✅ <strong>Без вирусов:</strong> Код открыт и доступен на
                    GitHub.
                  </li>
                  <li>
                    ✅ <strong>Без слежки:</strong> Приложение не отправляет
                    ваши банковские SMS на сервер.
                  </li>
                  <li>
                    ✅ <strong>Без рекламы:</strong> Мы не монетизируем ваши
                    данные.
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500">
                    MD5 Checksum (Universal): <br />
                    <code className="bg-gray-200 dark:bg-gray-900 px-1 py-0.5 rounded select-all">
                      7a9d...f2b1
                    </code>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon */}
          <div className="mt-24 pt-12 border-t border-gray-200 dark:border-gray-800 text-center">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">
              Скоро на других платформах
            </p>
            <div className="flex justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex flex-col items-center gap-2">
                <svg
                  className="w-10 h-10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5M13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                </svg>
                <span className="text-xs font-medium">iOS (PWA)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <svg
                  className="w-10 h-10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M3,12V6.75L9,5.43V11.91L3,12M20,3V11.75L10,11.9V5.21L20,3M3,13L9,13.09V19.9L3,18.75V13M20,13.25V22L10,20.09V13.1L20,13.25Z" />
                </svg>
                <span className="text-xs font-medium">Windows</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DownloadPage;
