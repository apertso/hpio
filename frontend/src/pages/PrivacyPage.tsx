import React from "react";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";

const PrivacyPage: React.FC = () => {
  const metadata = getPageMetadata("privacy");

  return (
    <>
      <PageMeta {...metadata} />

      <section className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg mb-10">
        <div className="prose dark:prose-invert max-w-none">
          <h1 className="text-xl md:text-2xl font-bold mb-4">
            Политика конфиденциальности
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-8">
            Последнее обновление: 12.08.2025
          </p>
          <h2 className="text-xl font-bold my-6">1. Общие положения</h2>
          <p>
            1.1. Настоящая Политика конфиденциальности (далее - «Политика»)
            описывает, как Администрация сервиса обрабатывает персональные
            данные Пользователей. 1.2. Политика разработана в соответствии с
            Федеральным законом РФ № 152-ФЗ «О персональных данных».
          </p>

          <h2 className="text-xl font-bold my-6">
            2. Какие данные мы собираем
          </h2>
          <ul className="list-disc list-inside ml-6">
            <li>Имя и адрес электронной почты, указанные при регистрации;</li>
            <li>Пароль (хранится в зашифрованном виде);</li>
            <li>Загруженные Пользователем файлы и иные данные;</li>
            <li>
              IP-адрес, данные о браузере и устройстве (для обеспечения
              безопасности и улучшения работы сервиса).
            </li>
          </ul>

          <h2 className="text-xl font-bold my-6">3. Цели обработки данных</h2>
          <ul className="list-disc list-inside ml-6">
            <li>Предоставление доступа к сервису и его функционалу;</li>
            <li>Техническая поддержка и обратная связь;</li>
            <li>Улучшение качества работы сервиса;</li>
            <li>Обеспечение безопасности аккаунтов Пользователей.</li>
          </ul>

          <h2 className="text-xl font-bold my-6">
            4. Хранение и защита данных
          </h2>
          <p>
            4.1. Все персональные данные хранятся на защищённых серверах, доступ
            к которым ограничен.
          </p>
          <p>
            4.2. Пароли хранятся в зашифрованном виде с использованием стойких
            алгоритмов хеширования.
          </p>
          <p>4.3. Передача данных осуществляется по защищённым протоколам.</p>

          <h2 className="text-xl font-bold my-6">
            5. Передача данных третьим лицам
          </h2>
          <p>
            5.1. Персональные данные не передаются третьим лицам, за исключением
            случаев, предусмотренных законодательством РФ.
          </p>

          <h2 className="text-xl font-bold my-6">6. Права пользователя</h2>
          <p>6.1. Пользователь имеет право:</p>
          <ul className="list-disc list-inside ml-6">
            <li>запрашивать копию своих персональных данных;</li>
            <li>требовать их исправления или удаления;</li>
            <li>удалять свой аккаунт через соответствующую функцию сервиса.</li>
          </ul>

          <h2 className="text-xl font-bold my-6">7. Изменения политики</h2>
          <p>
            7.1. Администрация вправе изменять Политику, уведомляя об этом
            Пользователей через сервис или по электронной почте.
          </p>
        </div>
      </section>
    </>
  );
};

export default PrivacyPage;
