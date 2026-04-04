# Coding Guidelines

This document outlines the standard practices and guidelines for development in this project. Adhering to these guidelines ensures consistency, maintainability, and quality across the codebase.

## Language Conventions

These conventions apply to **the entire project**, including frontend (TypeScript/React), backend (TypeScript/Node.js), and mobile (Kotlin/Android).

### Code Comments and Documentation

All code comments and inline documentation should be written in **Russian**. This includes:

- Function and class docstring comments
- Inline comments explaining complex logic
- TypeScript/Kotlin interface and type descriptions
- Code-level documentation
- Any developer-facing text in the code

**Note**: External-facing documentation (README.md in the repository root, API documentation for third parties) may be in English for international accessibility.

### Log Messages

All log messages should be written in **English**. This includes:

- `logger.info()` / `Log.d()` messages
- `logger.warn()` / `Log.w()` messages
- `logger.error()` / `Log.e()` messages
- Console output messages
- Error messages for monitoring and debugging systems
- Exception messages and stack traces

**Rationale**: Russian comments make the code more accessible to Russian-speaking developers working on this project, while English logs ensure compatibility with monitoring tools, international debugging standards, and make logs searchable using common technical terminology.

## Return Types

Always explicitly declare return types for functions in TypeScript.

Use boolean return types instead: return `boolean | null` or throw error if another type is returned.

Omit return types only for:

- Private/internal helper functions with obvious types
- Very short arrow functions
- React component props

## TypeScript Type Safety

Never use the `any` type. Use `unknown` instead and narrow the type.

## Android Notification Automation

This pipeline is sensitive to the runtime environment, so follow these rules:

- **Notification deduplication.** `PaymentNotificationListenerService` stores a `package|title|text` key inside `notification_dedup.json` and suppresses repeats for `DEDUP_TIME_WINDOW_MS` (60 seconds by default). To test the same payload again either wait for the timeout or change the payload. Shrinking the window is acceptable only in debug builds; removing dedup is forbidden.
- **Dual event channels.** Native code **must** emit both the Tauri event (`window.__TAURI_INTERNALS__.event.emit('payment-notification-received', …)`) and the fallback `CustomEvent('hpio-native-notification')`. `__TAURI_INTERNALS__` may be missing or not initialized inside the WebView, while the DOM event guarantees that React will call `processNotifications()`. Do not remove either channel unless you have a proven replacement.
- **Frontend handling.** The React app has to subscribe to both events. This prevents “silent” stalls where notifications remain in `pending_notifications.json` but `SuggestionModal` never opens.

## Form Validation

### Default Behavior

All forms in this project should adhere to a "smart" real-time validation approach to provide immediate feedback to the user and improve the user experience.

### Key Principles:

1.  **Schema-Based Validation**: Use `zod` to define validation schemas for all forms. This keeps validation logic declarative, centralized, and easy to maintain.

2.  **Real-time Feedback**: Use `react-hook-form` configured to validate fields `onChange`. This mode provides instant feedback as the user types, helping them correct errors before submitting the form.

3.  **Delayed Error Display**: To prevent showing validation errors too aggressively while the user is typing, we will use a delay. The `delayError` option in `react-hook-form` will be set to `1000` milliseconds (1 second). This ensures that error messages only appear after the user has paused typing.

4.  **Immediate Error Clearing**: When a validation error is displayed for a field, it should be cleared as soon as the user starts typing in that field again. This provides a less intrusive experience. This can be achieved by using `clearErrors` from `react-hook-form` within a custom `onChange` handler.

    ```tsx
    // Example useForm configuration and Input usage
    const {
      register,
      handleSubmit,
      formState: { errors },
      clearErrors,
    } = useForm({
      resolver: zodResolver(yourSchema),
      mode: "onChange",
      delayError: 1000,
    });

    <Input
      {...register("fieldName")}
      onChange={(e) => {
        clearErrors("fieldName");
        register("fieldName").onChange(e);
      }}
      error={errors.fieldName?.message}
    />;
    ```

5.  **Submission Validation**: While real-time validation is primary, a final validation pass will always occur upon form submission to ensure data integrity before sending it to the server.

This approach ensures that validation is consistent, efficient, and user-friendly across the application.

## UI/UX Guidelines

### Interactive Elements

All interactive elements (buttons, links, clickable areas) must include the `cursor-pointer` class to provide clear visual feedback to users. This ensures a consistent and intuitive user experience across the application.

**Examples:**

- Tab buttons
- Action buttons
- Clickable cards
- Navigation links with custom styling

```tsx
// ✅ Good
<button className="... cursor-pointer" onClick={handleClick}>
  Click me
</button>

// ❌ Bad - missing cursor indicator
<button className="..." onClick={handleClick}>
  Click me
</button>
```

### Hover Styles

To maintain a consistent user experience, all links and icon buttons should follow these hover style guidelines:

#### Text Links

Text links (navigation links, footer links, etc.) should use opacity-based hover effects:

```tsx
// ✅ Good - text link with opacity hover
<Link
  to="/dashboard"
  className="text-black dark:text-white hover:opacity-80 transition-opacity"
>
  Главная
</Link>
```

#### Icon Button Links

Icon button links (GitHub icon, theme switcher, feedback widget, etc.) should combine background hover effects with opacity for a smooth transition without layout shifts:

```tsx
// ✅ Good - icon button with background + opacity
<button
  onClick={handleClick}
  className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 hover:opacity-80 transition-all cursor-pointer"
  aria-label="Action"
>
  <Icon className="h-5 w-5" />
</button>
```

**Key Principles:**

1. **No Layout Shifts**: Hover effects should never cause elements to shift position (prefer opacity/background over borders)
2. **Consistent Opacity**: Use `hover:opacity-80` for the opacity effect
3. **Smooth Transitions**: Use `transition-opacity` for text links or `transition-all` for combined effects
4. **Background Circles**: Icon buttons use rounded backgrounds (`rounded-full`) with hover background colors
5. **Logo Reference**: The KhochuPlachu logo uses `hover:opacity-80 transition-opacity` as the standard reference

### Empty States

Empty state messages must be contextual and reflect the current view or filter. Each section should display an appropriate message when no data is available.

**Examples:**

- "Нет платежей" - General empty state
- "Нет активных платежей" - Active payments tab
- "Архив пуст" - Archive tab
- "Корзина пуста" - Trash tab

## Backend Architecture

### Service-Model Responsibility

Each database model should be accessible only from the corresponding service that serves the model.
- **Exceptions**:
  - **Includes/Joins**: It is permissible to export the Model class (e.g. `SeriesModel`) from the service to allow other services to include it in Sequelize queries for joins.
  - **Transactions**: Services may accept transaction objects to participate in cross-service atomic operations.

**Examples:**
- `db.RecurringSeries` should be accessed directly only in `seriesService.ts`. Other services (like `paymentService.ts`) must import helper functions from `seriesService.ts`.
- `db.Payment` should be accessed directly only in `paymentService.ts`.

## Recurring Payments

### Generation Logic

The system employs a multi-faceted approach to generate recurring payments, ensuring both responsiveness and reliability.

1.  **Real-time Generation**: When a user marks a recurring payment as 'completed' or 'deletes' an instance, the system immediately attempts to generate the next payment in the series. This provides instant feedback in the UI.

2.  **Scheduled Job (Cron)**: A daily background job acts as a safety net. Its primary purpose is to find "stuck" series - those that are active but have no upcoming or overdue payments. This can happen if a user hasn't interacted with the app for a long time. The job will:
    - Identify active series without any `upcoming` or `overdue` payments.
    - Calculate the correct next payment date based on the series' `rrule` and its last known payment.
    - **Crucially, it will check if a payment for the calculated date already exists before creating a new one to prevent duplicates.**
    - If no more valid future dates exist for a series (e.g., it has passed its end date), the job will automatically deactivate it.

## Timezones

All dates sent to and from the API should be handled consistently with respect to the user's timezone.

1.  **User-Centric Dates**: When a user inputs a date (e.g., `2025-08-15`), this date represents the entire day from start to finish _in their local timezone_.
2.  **API Communication**: Dates in API requests and responses (for fields like `dueDate`) should be sent as `YYYY-MM-DD` strings. The backend must interpret these strings as representing a date in the user's timezone, not UTC or server time.
3.  **Backend Logic**: All date-based calculations and comparisons on the backend (e.g., determining if a payment is overdue, filtering by a date range) must correctly account for the user's timezone, which is stored in their profile.
4.  **`DATETIME` Fields**: Fields with time components (e.g., `completedAt`) are stored in UTC in the database. When querying these fields based on a user-provided date range, the backend must convert the user-timezone date range into a UTC time range before executing the database query.

## Suggestion Modal

The suggestion modal displays payment suggestions parsed from bank notifications. To provide a good user experience and prevent crashes, the modal implements several key behaviors:

### Processed Suggestions Tracking

1.  **Persistent Tracking**: When a user accepts or dismisses a suggestion, its ID is added to a `processedSuggestionIds` set. This prevents already-processed suggestions from reappearing during periodic refetches.
2.  **Filtering on Refetch**: When suggestions are refetched from the server (e.g., during periodic sync), they are filtered to exclude any IDs in the processed set.
3.  **Reset on Completion**: When all suggestions are processed and the modal closes naturally, the processed IDs set is cleared for the next session.

### Modal Dismissal Logic

The modal should not repeatedly reopen if the user has explicitly closed it:

1.  **Manual Close**: When the user clicks the X button to close the modal, a `suggestionModalDismissed` flag is set to `true`.
2.  **Stay Closed on Refetch**: If suggestions are refetched but no new suggestions appear (same IDs as before), the modal remains closed.
3.  **Reopen on New Suggestions**: If genuinely new suggestions arrive (IDs not in the current suggestions list), the modal automatically reopens and the dismissed flag is reset.
4.  **Reset on Completion**: When the user processes all suggestions naturally, the dismissed flag is reset to allow the modal to appear for future suggestions.

### Index Safety

To prevent crashes when the suggestions array changes during use (e.g., after a refetch that removes processed suggestions):

1.  **Automatic Index Reset**: A `useEffect` monitors the `suggestions` array and `currentIndex`. If the index becomes out of bounds (`>= suggestions.length`), it automatically resets to 0 and clears the form state.
2.  **Defensive Checks**: The component includes optional chaining (`?.`) when accessing suggestion properties and early returns if `currentSuggestion` is undefined, providing a safety net against edge cases.

This multi-layered approach ensures the modal is helpful without being intrusive, and remains stable even when suggestions change during user interaction.

## Component specs (`*.spec.md`)

- React components may have `.spec.md` next to them.
- File contains bullet-point hard rules for the component (non-negotiable).

AI:

- must read and obey all rules in `.spec.md`
- must NOT edit `.spec.md`
- must NOT create new `.spec.md`
- must NOT delete `.spec.md` while `.tsx` exists
- may change `.tsx` only if all `.spec.md` rules stay true
