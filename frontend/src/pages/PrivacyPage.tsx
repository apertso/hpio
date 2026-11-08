import type { ReactElement } from "react";
import LegalDocument, { type LegalSection } from "../components/LegalDocument";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";

const sections: LegalSection[] = [
  {
    id: "general",
    ru: {
      title: "Общие положения",
      body: (
        <>
          <p>
            1.1. Настоящая Политика конфиденциальности (далее - «Политика»)
            описывает, как Администрация сервиса обрабатывает персональные
            данные Пользователей. 1.2. Политика разработана в соответствии с
            Федеральным законом РФ № 152-ФЗ «О персональных данных».
          </p>
        </>
      ),
    },
    en: {
      title: "General provisions",
      body: (
        <>
          <p>1.1. This Privacy Policy (the “Policy”) describes how the service operator (the “Operator”) processes Users’ personal data. 1.2. The Policy was drawn up in accordance with Russian Federal Law No. 152-FZ “On Personal Data.”</p>
        </>
      ),
    },
  },
  {
    id: "collected-data",
    ru: {
      title: "Какие данные мы собираем",
      body: (
        <>
          <ul>
            <li>Имя и адрес электронной почты, указанные при регистрации;</li>
            <li>Пароль (хранится в зашифрованном виде);</li>
            <li>Загруженные Пользователем файлы и иные данные;</li>
            <li>
              IP-адрес, данные о браузере и устройстве (для обеспечения
              безопасности и улучшения работы сервиса).
            </li>
          </ul>
        </>
      ),
    },
    en: {
      title: "Data we collect",
      body: (
        <>
          <ul>
            <li>The name and email address provided at registration;</li>
            <li>The password (stored in encrypted form);</li>
            <li>Files and other data uploaded by the User;</li>
            <li>The IP address and information about the browser and device, for security and to improve the service.</li>
          </ul>
        </>
      ),
    },
  },
  {
    id: "purposes",
    ru: {
      title: "Цели обработки данных",
      body: (
        <>
          <ul>
            <li>Предоставление доступа к сервису и его функционалу;</li>
            <li>Техническая поддержка и обратная связь;</li>
            <li>Улучшение качества работы сервиса;</li>
            <li>Обеспечение безопасности аккаунтов Пользователей.</li>
          </ul>
        </>
      ),
    },
    en: {
      title: "Why we process data",
      body: (
        <>
          <ul>
            <li>To provide access to the service and its features;</li>
            <li>To provide technical support and handle feedback;</li>
            <li>To improve the quality of the service;</li>
            <li>To protect Users’ accounts.</li>
          </ul>
        </>
      ),
    },
  },
  {
    id: "storage",
    ru: {
      title: "Хранение и защита данных",
      body: (
        <>
          <p>
            4.1. Все персональные данные хранятся на защищённых серверах, доступ
            к которым ограничен.
          </p>
          <p>
            4.2. Пароли хранятся в зашифрованном виде с использованием стойких
            алгоритмов хеширования.
          </p>
          <p>4.3. Передача данных осуществляется по защищённым протоколам.</p>
        </>
      ),
    },
    en: {
      title: "Data storage and protection",
      body: (
        <>
          <p>4.1. All personal data is stored on secure servers with restricted access.</p>
          <p>4.2. Passwords are protected using strong hashing algorithms.</p>
          <p>4.3. Data is transmitted over secure protocols.</p>
        </>
      ),
    },
  },
  {
    id: "third-parties",
    ru: {
      title: "Передача данных третьим лицам",
      body: (
        <>
          <p>
            5.1. Персональные данные не передаются третьим лицам, за исключением
            случаев, предусмотренных законодательством РФ.
          </p>
        </>
      ),
    },
    en: {
      title: "Sharing data with third parties",
      body: (
        <>
          <p>5.1. Personal data is not shared with third parties except as provided for by Russian law.</p>
        </>
      ),
    },
  },
  {
    id: "rights",
    ru: {
      title: "Права пользователя",
      body: (
        <>
          <p>6.1. Пользователь имеет право:</p>
          <ul>
            <li>запрашивать копию своих персональных данных;</li>
            <li>требовать их исправления или удаления;</li>
            <li>удалять свой аккаунт через соответствующую функцию сервиса.</li>
          </ul>
        </>
      ),
    },
    en: {
      title: "User rights",
      body: (
        <>
          <p>6.1. The User has the right to:</p>
          <ul>
            <li>request a copy of their personal data;</li>
            <li>request that it be corrected or deleted;</li>
            <li>delete their account using the feature provided by the service.</li>
          </ul>
        </>
      ),
    },
  },
  {
    id: "changes",
    ru: {
      title: "Изменения политики",
      body: (
        <>
          <p>
            7.1. Администрация вправе изменять Политику, уведомляя об этом
            Пользователей через сервис или по электронной почте.
          </p>
        </>
      ),
    },
    en: {
      title: "Changes to this policy",
      body: (
        <>
          <p>7.1. The Operator may amend the Policy and notify Users through the service or by email.</p>
        </>
      ),
    },
  },
];

export default function PrivacyPage(): ReactElement {
  return (
    <>
      <PageMeta {...getPageMetadata("privacy")} />
      <LegalDocument title="Политика конфиденциальности" sections={sections} />
    </>
  );
}
