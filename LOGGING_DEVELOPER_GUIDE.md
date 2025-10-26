# Руководство разработчика по системе логирования

## Быстрый старт

### Просмотр логов в разработке

1. Запустите приложение на Android устройстве/эмуляторе
2. Выполните действия, которые хотите отследить
3. Перейдите в Настройки → "Скачать логи"
4. Логи сохранятся в файл `logs.txt`

### Чтение логов

Логи представляют собой текстовый файл с временными метками:

```
[2025-10-25T10:30:45.123Z] [INFO] Application initialized
[2025-10-25T10:30:45.456Z] [BREADCRUMB] {"action":"navigation","route":"/dashboard"}
[2025-10-25T10:30:50.789Z] [ERROR] [JS_ERROR] {...}
```

Используйте текстовый редактор или инструменты командной строки:

```bash
# Найти все ошибки
grep "\[ERROR\]" logs.txt

# Найти JS ошибки
grep "JS_ERROR" logs.txt

# Найти Kotlin исключения
grep "KOTLIN_EXCEPTION" logs.txt

# Последние 100 строк
tail -100 logs.txt
```

## Примеры использования

### 1. Логирование в try-catch блоках

```typescript
import { logError } from "./utils/errorHandlers";

async function processPayment(paymentData) {
  try {
    const result = await api.createPayment(paymentData);
    return result;
  } catch (error) {
    // Автоматически залогируется с контекстом
    logError(error, {
      context: "payment_processing",
      paymentAmount: paymentData.amount,
      categoryId: paymentData.categoryId,
    });
    throw error; // Пробрасываем дальше для UI
  }
}
```

### 2. Отслеживание пользовательских действий

```typescript
import { trackClick, trackFormSubmit } from "./utils/breadcrumbs";

function PaymentForm() {
  const handleSubmit = (data) => {
    trackFormSubmit("create_payment_form", {
      hasCategory: !!data.categoryId,
      isRecurring: !!data.recurrenceRule,
      amount: data.amount,
    });

    // Отправка данных...
  };

  const handleCategorySelect = (categoryId) => {
    trackClick("category_selector", { categoryId });
    setCategory(categoryId);
  };

  return <form onSubmit={handleSubmit}>{/* Форма */}</form>;
}
```

### 3. Отслеживание критических операций

```typescript
import logger from "./utils/logger";

async function deleteUserAccount(userId: string) {
  logger.info("Starting account deletion", { userId });

  try {
    await api.deleteAccount(userId);
    logger.info("Account deletion completed", { userId });
  } catch (error) {
    logger.error("Account deletion failed", { userId, error });
    throw error;
  }
}
```

## Анализ типичных проблем

### JavaScript ошибки

**Поиск:**

```bash
grep "JS_ERROR" logs.txt | jq -r '.message' | sort | uniq -c
```

**Пример лога:**

```json
{
  "type": "JS_ERROR",
  "message": "Cannot read property 'id' of undefined",
  "stack": "at PaymentCard.tsx:45:12",
  "route": "/payments"
}
```

**Решение:**

- Проверьте null/undefined перед доступом к свойствам
- Добавьте проверки данных от API
- Используйте optional chaining (`?.`)

### UI Freezes

**Поиск:**

```bash
grep "UI_FREEZE" logs.txt
```

**Пример лога:**

```json
{
  "type": "UI_FREEZE",
  "message": "UI was frozen for 12345ms",
  "duration": 12345,
  "threshold": 10000
}
```

**Решение:**

- Проверьте breadcrumbs перед зависанием
- Оптимизируйте рендеринг больших списков
- Переместите тяжёлые вычисления в Web Workers
- Используйте виртуализацию для длинных списков

### Rust Panics

**Поиск:**

```bash
grep "RUST_PANIC" logs.txt
```

**Пример лога:**

```json
{
  "type": "RUST_PANIC",
  "message": "index out of bounds",
  "location": "src/notifications.rs:142:9"
}
```

**Решение:**

- Проверьте bounds при доступе к массивам
- Используйте `.get()` вместо прямого индексирования
- Добавьте валидацию входных данных

### Kotlin Exceptions

**Поиск:**

```bash
grep "KOTLIN_EXCEPTION" logs.txt
```

**Пример лога:**

```json
{
  "type": "KOTLIN_EXCEPTION",
  "message": "NullPointerException",
  "thread": "main",
  "stack": "at MainActivity.kt:56"
}
```

**Решение:**

- Используйте nullable types (`?`)
- Добавьте null-checks
- Используйте safe calls (`?.`)

## Отладка по breadcrumbs

Breadcrumbs показывают последовательность действий перед ошибкой:

```
[10:30:45] [BREADCRUMB] {"action":"navigation","route":"/payments"}
[10:30:47] [BREADCRUMB] {"action":"click","element":"add_payment_button"}
[10:30:48] [BREADCRUMB] {"action":"navigation","route":"/payments/new"}
[10:30:52] [BREADCRUMB] {"action":"form_submit","form":"payment_form"}
[10:30:53] [BREADCRUMB] {"action":"api_request","method":"POST","url":"/payments"}
[10:30:54] [ERROR] [JS_ERROR] {...}
```

**Анализ:**

1. Пользователь перешёл на страницу платежей
2. Нажал "Добавить платёж"
3. Заполнил форму и отправил
4. Произошёл POST запрос
5. **Ошибка произошла после API запроса**

→ Проверьте обработку ответа от API в форме создания платежа

## Мониторинг производительности

### Подсчёт ошибок по типам

```bash
grep "\[ERROR\]" logs.txt | grep -o '\[.*_.*\]' | sort | uniq -c | sort -rn
```

Результат:

```
  15 [JS_ERROR]
   3 [KOTLIN_EXCEPTION]
   2 [UI_FREEZE]
   1 [RUST_PANIC]
```

### Самые частые ошибки

```bash
grep "JS_ERROR" logs.txt | jq -r '.message' | sort | uniq -c | sort -rn | head -10
```

### API ошибки

```bash
grep "api_error" logs.txt | jq -r '{"url": .url, "error": .error}' | sort | uniq -c
```

## Best Practices

### 1. Логируйте контекст

❌ **Плохо:**

```typescript
catch (error) {
  logError(error);
}
```

✅ **Хорошо:**

```typescript
catch (error) {
  logError(error, {
    context: "payment_creation",
    userId: user.id,
    amount: paymentData.amount,
    categoryId: paymentData.categoryId,
  });
}
```

### 2. Используйте уровни логирования

```typescript
logger.debug("Detailed debug info"); // Для отладки
logger.info("User logged in"); // Информационные события
logger.warn("Deprecated API used"); // Предупреждения
logger.error("Failed to save", error); // Ошибки
```

### 3. Структурируйте breadcrumbs

```typescript
// Навигация
trackNavigation("/payments");

// Действия пользователя
trackClick("payment_item", { paymentId: id });

// Бизнес-события
trackBreadcrumb("payment_created", { amount: 100, categoryId: "cat123" });
```

### 4. Не логируйте чувствительные данные

❌ **Плохо:**

```typescript
logger.info("User data", { email: user.email, password: password });
```

✅ **Хорошо:**

```typescript
logger.info("User authenticated", { userId: user.id });
```

## Интеграция в CI/CD

### Автоматический анализ логов

```bash
#!/bin/bash
# analyze-logs.sh

LOG_FILE="logs.txt"

# Подсчёт ошибок
ERROR_COUNT=$(grep -c "\[ERROR\]" $LOG_FILE)
JS_ERRORS=$(grep -c "JS_ERROR" $LOG_FILE)
KOTLIN_ERRORS=$(grep -c "KOTLIN_EXCEPTION" $LOG_FILE)
FREEZES=$(grep -c "UI_FREEZE" $LOG_FILE)

echo "=== Анализ логов ==="
echo "Всего ошибок: $ERROR_COUNT"
echo "JS ошибки: $JS_ERRORS"
echo "Kotlin исключения: $KOTLIN_ERRORS"
echo "UI зависания: $FREEZES"

# Fail CI если слишком много ошибок
if [ $ERROR_COUNT -gt 10 ]; then
  echo "❌ Слишком много ошибок!"
  exit 1
fi

echo "✅ Анализ пройден"
```

## Troubleshooting

### Логи не создаются

1. Проверьте, что приложение запущено на Android (не в браузере)
2. Проверьте разрешения файловой системы
3. Проверьте консоль на ошибки записи в файл

### Логи пустые

1. Убедитесь, что инициализация запустилась (`main.tsx`)
2. Проверьте `isTauri()` и `isTauriMobile()` функции
3. Проверьте права доступа к `BaseDirectory.AppData`

### Не все ошибки логируются

1. Убедитесь, что Error Boundary обёрнут вокруг всего приложения
2. Проверьте, что глобальные handlers инициализированы
3. Для критических мест используйте `try-catch` с `logError()`

## Получение поддержки

При создании issue включите:

1. Версию приложения
2. Модель устройства и версию Android
3. Релевантную часть логов (без личных данных)
4. Шаги для воспроизведения

Пример:

```
**Версия:** 0.0.9
**Устройство:** Samsung Galaxy S21, Android 13
**Ошибка:** JS_ERROR при создании платежа

Логи:
[ERROR] [JS_ERROR] {"message":"Cannot read property 'id' of undefined",...}

Шаги:
1. Открыть форму создания платежа
2. Заполнить все поля
3. Нажать "Создать"
4. Ошибка появляется
```
