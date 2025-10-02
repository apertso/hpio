# Coding Guidelines

This document outlines the standard practices and guidelines for development in this project. Adhering to these guidelines ensures consistency, maintainability, and quality across the codebase.

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
