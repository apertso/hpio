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
