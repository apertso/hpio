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
            1.1. Настоящее Пользовательское соглашение (далее - «Соглашение»)
            регулирует отношения между владельцем сервиса (далее -
            «Администрация») и физическим или юридическим лицом, использующим
            сервис (далее - «Пользователь»).
          </p>
          <p>
            1.2. Используя сервис, Пользователь подтверждает, что ознакомился и
            согласен с условиями Соглашения.
          </p>
        </>
      ),
    },
    en: {
      title: "General provisions",
      body: (
        <>
          <p>1.1. These Terms of Use (the “Terms”) govern the relationship between the owner of the service (the “Operator”) and any individual or legal entity that uses the service (the “User”).</p>
          <p>1.2. By using the service, the User confirms that they have read and agree to the Terms.</p>
        </>
      ),
    },
  },
  {
    id: "service",
    ru: {
      title: "Описание сервиса",
      body: (
        <>
          <p>
            2.1. Сервис предназначен для учёта, планирования и хранения
            информации о платежах и иных финансовых событиях пользователя.
          </p>
          <p>
            2.2. Сервис <strong>не является</strong> платёжной системой, банком
            или кредитной организацией, не принимает, не хранит и не переводит
            денежные средства.
          </p>
          <p>
            2.3. Сервис предоставляется в бесплатном режиме и «как есть» без
            каких-либо гарантий.
          </p>
        </>
      ),
    },
    en: {
      title: "About the service",
      body: (
        <>
          <p>2.1. The service is intended for tracking, planning, and storing information about the User’s payments and other financial events.</p>
          <p>2.2. The service <strong>does not act as</strong> a payment system, bank, or credit institution. It does not accept, hold, or transfer funds.</p>
          <p>2.3. The service is provided free of charge and “as is” without any warranties.</p>
        </>
      ),
    },
  },
  {
    id: "account",
    ru: {
      title: "Регистрация и аккаунт",
      body: (
        <>
          <p>
            3.1. Для использования сервиса требуется регистрация с указанием
            имени, адреса электронной почты и пароля.
          </p>
          <p>
            3.2. Пользователь несёт ответственность за безопасность своего
            пароля и за все действия, совершённые через его аккаунт.
          </p>
        </>
      ),
    },
    en: {
      title: "Registration and account",
      body: (
        <>
          <p>3.1. To use the service, the User must register with a name, email address, and password.</p>
          <p>3.2. The User is responsible for keeping their password secure and for all activity carried out through their account.</p>
        </>
      ),
    },
  },
  {
    id: "content",
    ru: {
      title: "Контент и файлы",
      body: (
        <>
          <p>
            4.1. Пользователь может загружать файлы и данные, необходимые для
            работы сервиса.
          </p>
          <p>
            4.2. Запрещено размещение материалов, нарушающих законодательство
            РФ, включая, но не ограничиваясь:
          </p>
          <ul>
            <li>экстремистскими материалами;</li>
            <li>материалами, нарушающими авторские права;</li>
            <li>порнографическими и иными запрещёнными материалами.</li>
          </ul>
          <p>
            4.3. Администрация вправе удалять любой контент, нарушающий условия
            Соглашения или требования законодательства РФ.
          </p>
        </>
      ),
    },
    en: {
      title: "Content and files",
      body: (
        <>
          <p>4.1. The User may upload files and data needed to use the service.</p>
          <p>4.2. The User may not post materials that violate Russian law, including but not limited to:</p>
          <ul>
            <li>extremist material;</li>
            <li>material that infringes copyright;</li>
            <li>pornographic or other prohibited material.</li>
          </ul>
          <p>4.3. The Operator may remove any content that violates the Terms or Russian law.</p>
        </>
      ),
    },
  },
  {
    id: "responsibility",
    ru: {
      title: "Ответственность",
      body: (
        <>
          <p>5.1. Администрация не несёт ответственности за:</p>
          <ul>
            <li>достоверность данных, вводимых Пользователем;</li>
            <li>сбои или прерывания работы сервиса;</li>
            <li>утрату данных по вине Пользователя или третьих лиц.</li>
          </ul>
          <p>
            5.2. Пользователь обязуется самостоятельно делать резервные копии
            своих данных.
          </p>
        </>
      ),
    },
    en: {
      title: "Liability",
      body: (
        <>
          <p>5.1. The Operator is not liable for:</p>
          <ul>
            <li>the accuracy of data entered by the User;</li>
            <li>service failures or interruptions;</li>
            <li>loss of data caused by the User or third parties.</li>
          </ul>
          <p>5.2. The User agrees to back up their own data.</p>
        </>
      ),
    },
  },
  {
    id: "termination",
    ru: {
      title: "Прекращение доступа",
      body: (
        <>
          <p>
            6.1. Администрация вправе временно или навсегда заблокировать
            аккаунт Пользователя в случае нарушения условий Соглашения или
            требований законодательства.
          </p>
        </>
      ),
    },
    en: {
      title: "Termination of access",
      body: (
        <>
          <p>6.1. The Operator may suspend or permanently block the User’s account if the User violates the Terms or applicable law.</p>
        </>
      ),
    },
  },
  {
    id: "changes",
    ru: {
      title: "Заключительные положения",
      body: (
        <>
          <p>
            7.1. Администрация оставляет за собой право изменять условия
            Соглашения с уведомлением Пользователей через сервис или по
            электронной почте.
          </p>
        </>
      ),
    },
    en: {
      title: "Final provisions",
      body: (
        <>
          <p>7.1. The Operator reserves the right to amend the Terms and notify Users through the service or by email.</p>
        </>
      ),
    },
  },
];

export default function TermsPage(): ReactElement {
  return (
    <>
      <PageMeta {...getPageMetadata("terms")} />
      <LegalDocument title="Пользовательское соглашение" sections={sections} />
    </>
  );
}
