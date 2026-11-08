# <img src="frontend/public/icons/favicon.svg" width="32" height="32" alt=""> Hochu Plachu (HPIO)

[English](#english) · [Русский](#русский)

## English

Hochu Plachu is a free personal finance app. Track your expenses, see when bills and subscriptions are due, and get payment reminders.

**[Open the web app](https://hpio.ru/)** · **[Download for Android](https://hpio.ru/download)**

### Features

- Schedule one-time and recurring payments, with reminders when they are due.
- Track income, expenses, and account balances. See spending by category and period.
- Organize payments with categories, tags, notes, and receipt attachments.
- Turn supported Android bank notifications into suggested expenses you can review before adding. Supported banks include Sber, T-Bank, Raiffeisen, Ozon Bank, Yandex Bank, and Bank of Georgia.

### Tech stack

- **Web** — React 19, TypeScript, Vite, and Tailwind CSS
- **API** — Node.js, Express, TypeScript, Sequelize, and PostgreSQL
- **Android** — Tauri, Rust, and Kotlin. See the [APK build guide (in Russian)](frontend/README-ANDROID.md).

### Run locally

Use Node.js 22, npm, and PostgreSQL. Create a database, then run `CREATE SCHEMA IF NOT EXISTS dbo;` in that database as the application user.

```bash
git clone https://github.com/apertso/hpio.git
cd hpio/backend
npm ci
cp .env.example .env
```

Update the database connection settings in `backend/.env`. Set `DB_PORT=5432` if PostgreSQL uses its default port. Set your own `JWT_SECRET` and `JWT_RESET_SECRET`, then run `npm run dev` from `backend`. The backend creates missing tables on startup.

Run the following commands from the repository root in a second terminal.

```bash
cd frontend
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). The API runs on port `5000` by default.

For an existing database, compile the backend with `npx tsc` before running `npm run db:migrate` from `backend`.

### Roadmap ideas

Broader platform support, more flexible tags and filters, saved searches, bank statement import and export, configurable notifications, and more detailed spending analysis.

### Feedback and contributions

Report a bug or suggest a feature in [GitHub Issues](https://github.com/apertso/hpio/issues). Pull requests for fixes, documentation, and translations are welcome. For account questions, contact [support@hpio.ru](mailto:support@hpio.ru).

---

## Русский

[К английской версии](#english)

«Хочу Плачу» — бесплатное приложение для управления личными финансами. Ведите учёт расходов, следите за сроками оплаты счетов и подписок и получайте напоминания о платежах.

**[Открыть веб-приложение](https://hpio.ru/)** · **[Скачать для Android](https://hpio.ru/download)**

### Возможности

- Планируйте разовые и регулярные платежи и получайте напоминания в день оплаты.
- Ведите учёт доходов, расходов и остатков на счетах. Смотрите статистику по категориям и периодам.
- Добавляйте к платежам категории, теги, заметки и чеки.
- Добавляйте расходы из банковских уведомлений на Android после проверки. Поддерживаются Сбер, Т-Банк, Райффайзен, Ozon Банк, Яндекс Банк и Bank of Georgia.

### Технологии

- **Веб** — React 19, TypeScript, Vite и Tailwind CSS
- **API** — Node.js, Express, TypeScript, Sequelize и PostgreSQL
- **Android** — Tauri, Rust и Kotlin. См. [инструкцию по сборке APK](frontend/README-ANDROID.md).

### Локальный запуск

Понадобятся Node.js 22, npm и PostgreSQL. Создайте базу данных и выполните в ней `CREATE SCHEMA IF NOT EXISTS dbo;` от имени пользователя приложения.

```bash
git clone https://github.com/apertso/hpio.git
cd hpio/backend
npm ci
cp .env.example .env
```

Укажите параметры подключения к базе в `backend/.env`. Если PostgreSQL работает на стандартном порту, укажите `DB_PORT=5432`. Задайте свои `JWT_SECRET` и `JWT_RESET_SECRET`, затем выполните `npm run dev` из папки `backend`. При запуске сервер создаст недостающие таблицы.

Во втором терминале выполните следующие команды из корня репозитория.

```bash
cd frontend
npm ci
npm run dev
```

Откройте [localhost:5173](http://localhost:5173). По умолчанию API работает на порту `5000`.

Для обновления существующей базы сначала скомпилируйте сервер командой `npx tsc`, затем выполните `npm run db:migrate` из папки `backend`.

### Идеи для развития

Поддержка других платформ, более гибкие теги и фильтры, сохранённые запросы, импорт и экспорт банковских выписок, настройка уведомлений и более подробная аналитика расходов.

### Обратная связь и вклад в проект

Сообщайте об ошибках и предлагайте идеи в [GitHub Issues](https://github.com/apertso/hpio/issues). Приветствуются пул-реквесты с исправлениями, документацией и переводами. По вопросам аккаунта пишите на [support@hpio.ru](mailto:support@hpio.ru).
