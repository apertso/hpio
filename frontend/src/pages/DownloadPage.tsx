import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArchiveBoxIcon,
  CheckIcon,
  CpuChipIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import PageMeta from '../components/PageMeta';
import { LandingMobileMockup } from '../components/LandingMobileMockup';
import { useLanguage } from '../context/LanguageContext';
import { getPageMetadata } from '../utils/pageMetadata';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.6.0';
const releaseUrl = `https://cdn.hpio.ru/releases/${APP_VERSION}`;

const builds = [
  {
    name: 'Android ARM64',
    subtitle: 'Для современных смартфонов',
    description:
      'Оптимизированная 64-битная версия. Лучшая производительность и меньший размер файла. Подходит для большинства устройств, выпущенных после 2016 года.',
    filename: 'app-arm64-release.apk',
    icon: CpuChipIcon,
    recommended: true,
  },
  {
    name: 'Универсальная сборка Android',
    subtitle: 'Для старых устройств',
    description:
      'Включает библиотеки для всех архитектур процессоров. Используйте эту версию, если ARM64 не устанавливается или работает некорректно.',
    filename: 'app-universal-release.apk',
    icon: ArchiveBoxIcon,
    recommended: false,
  },
];

const steps = [
  {
    title: 'Скачайте файл',
    description:
      'Нажмите кнопку «Скачать» выше. Браузер может предупредить, что файл может быть опасным — это стандартное предупреждение для всех APK не из Google Play.',
  },
  {
    title: 'Разрешите установку',
    description:
      'Откройте скачанный файл. Если система попросит разрешение на установку из неизвестных источников, перейдите в настройки и включите его для вашего браузера или файлового менеджера.',
  },
  {
    title: 'Откройте приложение',
    description:
      'После установки иконка появится на главном экране. При первом запуске разрешите приложению отправлять уведомления для корректной работы напоминаний.',
  },
];

export default function DownloadPage(): ReactElement {
  const { t } = useLanguage();

  return (
    <div className="public-container public-section space-y-8 sm:space-y-12">
      <PageMeta {...getPageMetadata('download')} />
      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] md:grid-rows-[auto_1fr] lg:gap-x-16">
        <div className="min-w-0">
          <h1 className="public-title">{t('Хочу Плачу для Android')}</h1>
          <p className="public-lead mt-3 max-w-xl">
            {t(
              'Планируйте платежи и ведите учёт расходов на телефоне, даже без интернета.',
            )}
          </p>

          <section aria-labelledby="apk-builds" className="mt-8">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="apk-builds" className="public-subtitle">
                {t('Сборки APK')}
              </h2>
              <span className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
                {t('Версия {1}', APP_VERSION)}
              </span>
            </div>
            <ul className="grid gap-3">
              {builds.map(
                ({
                  name,
                  subtitle,
                  description,
                  filename,
                  icon: Icon,
                  recommended,
                }) => (
                  <li
                    key={filename}
                    className="card-base public-card grid items-center gap-4 p-4 min-[56rem]:grid-cols-[minmax(0,1fr)_auto] lg:p-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <Icon
                          className="size-5 shrink-0 text-indigo-700 dark:text-indigo-300"
                          aria-hidden="true"
                        />
                        <h3 className="text-base font-semibold">{t(name)}</h3>
                        {recommended && (
                          <span className="badge bg-indigo-50 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-200">
                            {t('Рекомендуется')}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {t(subtitle)}
                      </p>
                      <p className="mt-1 text-pretty text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {t(description)}
                      </p>
                    </div>
                    <a
                      href={`${releaseUrl}/${filename}`}
                      download={filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${t('Скачать APK')} · ${t(name)}`}
                      className={`public-action inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm ${recommended ? 'primary-action' : 'border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5'}`}
                    >
                      <ArrowDownTrayIcon
                        className="size-5 shrink-0 text-indigo-700 dark:text-indigo-300"
                        aria-hidden="true"
                      />
                      {t('Скачать APK')}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </section>
        </div>
        <section
          aria-labelledby="apk-install"
          className="border-t border-gray-200 pt-8 md:col-start-1 md:row-start-2 dark:border-white/10"
        >
          <h2 id="apk-install" className="public-subtitle">
            {t('Как установить')}
          </h2>
          <ol className="mt-6 space-y-6">
            {steps.map(({ title, description }, index) => (
              <li key={title} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-50 text-sm font-semibold tabular-nums text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-200"
                >
                  {index + 1}
                </span>
                <div className="max-w-prose">
                  <h3 className="font-semibold">{t(title)}</h3>
                  <p className="mt-1 text-pretty text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {t(description)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <div className="flex min-w-0 flex-col gap-8 md:col-start-2 md:row-span-2 md:row-start-1">
          <section
            aria-labelledby="apk-security"
            className="card-base public-card p-4 sm:p-6 md:order-1"
          >
            <h2
              id="apk-security"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <ShieldCheckIcon
                className="size-5 shrink-0 text-indigo-700 dark:text-indigo-300"
                aria-hidden="true"
              />
              {t('Безопасность')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {t(
                'Мы распространяем приложение напрямую (APK), так как российские финансовые приложения часто удаляются из сторов.',
              )}
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <CheckIcon
                  className="mt-0.5 size-4 shrink-0 text-indigo-700 dark:text-indigo-300"
                  aria-hidden="true"
                />
                <a
                  href="https://github.com/apertso/hpio"
                  className="public-link underline underline-offset-2"
                >
                  {t('Исходный код на GitHub')}
                </a>
              </li>
              {[
                'Приложение не отправляет ваши банковские SMS на сервер.',
                'В приложении нет рекламы. Мы не монетизируем ваши данные.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <CheckIcon
                    className="mt-0.5 size-4 shrink-0 text-indigo-700 dark:text-indigo-300"
                    aria-hidden="true"
                  />
                  <span>{t(line)}</span>
                </li>
              ))}
            </ul>
          </section>
          <LandingMobileMockup />
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t('Скоро на других платформах')}:{' '}
          <span className="font-semibold">{t('iOS (PWA) и Windows')}</span>
        </p>
        <Link
          to="/login"
          className="public-link inline-flex min-h-11 items-center self-start text-sm sm:self-auto"
        >
          {t('Войти в веб-версию')}
        </Link>
      </div>
    </div>
  );
}
