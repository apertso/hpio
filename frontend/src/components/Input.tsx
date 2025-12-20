import React, {
  InputHTMLAttributes,
  forwardRef,
  useState,
  useMemo,
  useId,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  isInvalid?: boolean;
  unstyled?: boolean;
}

const shouldSkipStyling = (type?: string, unstyled?: boolean): boolean => {
  if (unstyled !== undefined) {
    return unstyled;
  }
  if (!type) {
    return false;
  }
  const unstyledTypes = new Set(["hidden", "file", "checkbox", "radio"]);
  return unstyledTypes.has(type);
};

const buildClassName = (baseClasses: string[], className: string): string => {
  return [...baseClasses, className].filter(Boolean).join(" ").trim();
};

const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    className = "",
    type = "text",
    disabled,
    isInvalid = false,
    unstyled,
    autoComplete,
    ...rest
  } = props;
  const skipStyling = shouldSkipStyling(type, unstyled);
  const { ["aria-invalid"]: ariaInvalid, ...restProps } = rest;
  const baseClasses = skipStyling
    ? []
    : [
        "block",
        "w-full",
        "min-w-[12em]",
        "max-w-[64em]",
        "rounded-xl",
        "bg-white",
        "border",
        "border-gray-200",
        "px-3",
        "py-2.5",
        "text-base",
        "text-gray-900",
        "placeholder:text-gray-500",
        "shadow-sm",
        "transition-colors",
        "focus:outline-none",
        "focus:ring-2",
        "focus:ring-indigo-500",
        "focus:border-indigo-500",
        "dark:bg-gray-900",
        "dark:border-gray-700",
        "dark:text-gray-100",
        "dark:placeholder:text-gray-500",
      ];

  if (!skipStyling && disabled) {
    baseClasses.push(
      "bg-gray-100",
      "text-gray-500",
      "opacity-70",
      "cursor-not-allowed",
      "dark:bg-gray-900",
      "dark:text-gray-500"
    );
  }

  if (!skipStyling && isInvalid) {
    baseClasses.push(
      "border-red-500",
      "focus:ring-2",
      "focus:ring-red-500",
      "focus:border-red-500"
    );
  }

  const resolvedAutoComplete =
    autoComplete !== undefined ? autoComplete : "off";

  return (
    <input
      {...restProps}
      ref={ref}
      type={type}
      className={
        skipStyling ? className : buildClassName(baseClasses, className)
      }
      disabled={disabled}
      autoComplete={resolvedAutoComplete}
      aria-invalid={
        ariaInvalid !== undefined ? ariaInvalid : isInvalid || undefined
      }
    />
  );
});

Input.displayName = "Input";

interface TextFieldContextValue {
  inputId: string;
  describedBy?: string;
  hasError: boolean;
}

const TextFieldContext = createContext<TextFieldContextValue | null>(null);

export interface TextFieldProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  description?: ReactNode;
  required?: boolean;
  inputId?: string;
  children?: ReactNode;
}

const TextFieldRoot: React.FC<TextFieldProps> = (props) => {
  const {
    label,
    hint,
    error,
    description,
    inputId,
    className = "",
    children,
    ...rest
  } = props;
  const generatedId = useId();
  const fieldId = inputId ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = useMemo(() => {
    return (
      [descriptionId, hintId, errorId].filter(Boolean).join(" ") || undefined
    );
  }, [descriptionId, hintId, errorId]);
  const contextValue = useMemo<TextFieldContextValue>(
    () => ({
      inputId: fieldId,
      describedBy,
      hasError: Boolean(error),
    }),
    [fieldId, describedBy, error]
  );

  return (
    <TextFieldContext.Provider value={contextValue}>
      <div
        className={`flex w-full max-w-[64em] flex-col gap-2 ${className}`.trim()}
        {...rest}
      >
        {label && (
          <label
            htmlFor={fieldId}
            className="text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            {label}
          </label>
        )}
        {children}
        {description && (
          <p
            id={descriptionId}
            className="text-sm text-gray-600 dark:text-gray-400"
          >
            {description}
          </p>
        )}
        {hint && (
          <p id={hintId} className="text-sm text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    </TextFieldContext.Provider>
  );
};

const TextFieldInput = forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => {
    const context = useContext(TextFieldContext);
    if (!context) {
      return <Input ref={ref} {...props} />;
    }
    const { inputId, describedBy, hasError } = context;
    const { className = "", isInvalid, id, unstyled, ...rest } = props;
    const { ["aria-describedby"]: ariaDescribedBy, ...restProps } = rest;
    const combinedDescribedBy =
      [describedBy, ariaDescribedBy].filter(Boolean).join(" ") || undefined;

    return (
      <Input
        ref={ref}
        id={id ?? inputId}
        className={`min-w-[100px] ${className}`}
        isInvalid={isInvalid ?? hasError}
        aria-describedby={combinedDescribedBy}
        unstyled={unstyled}
        {...restProps}
      />
    );
  }
);

TextFieldInput.displayName = "TextField.Input";

interface TextFieldSubComponentProps {
  children?: ReactNode;
  className?: string;
}

const TextFieldHint: React.FC<TextFieldSubComponentProps> = ({
  children,
  className = "",
}) => {
  const context = useContext(TextFieldContext);
  if (!context || !children) {
    return null;
  }
  const hintId = `${context.inputId}-hint`;

  return (
    <p
      id={hintId}
      className={`text-sm text-gray-500 dark:text-gray-400 ${className}`.trim()}
    >
      {children}
    </p>
  );
};

const TextFieldError: React.FC<TextFieldSubComponentProps> = ({
  children,
  className = "",
}) => {
  const context = useContext(TextFieldContext);
  if (!context || !children) {
    return null;
  }
  const errorId = `${context.inputId}-error`;

  return (
    <p id={errorId} className={`text-sm text-red-500 ${className}`.trim()}>
      {children}
    </p>
  );
};

const TextFieldDescription: React.FC<TextFieldSubComponentProps> = ({
  children,
  className = "",
}) => {
  const context = useContext(TextFieldContext);
  if (!context || !children) {
    return null;
  }
  const descriptionId = `${context.inputId}-description`;

  return (
    <p
      id={descriptionId}
      className={`text-sm text-gray-600 dark:text-gray-400 ${className}`.trim()}
    >
      {children}
    </p>
  );
};

const TextFieldLabel: React.FC<TextFieldSubComponentProps> = ({
  children,
  className = "",
}) => {
  const context = useContext(TextFieldContext);
  if (!context || !children) {
    return null;
  }

  return (
    <label
      htmlFor={context.inputId}
      className={`text-sm font-medium text-gray-700 dark:text-gray-200 ${className}`.trim()}
    >
      {children}
    </label>
  );
};

const TextField = Object.assign(TextFieldRoot, {
  Input: TextFieldInput,
  Hint: TextFieldHint,
  Error: TextFieldError,
  Description: TextFieldDescription,
  Label: TextFieldLabel,
});

type BaseFieldProps = Pick<
  TextFieldProps,
  "label" | "hint" | "error" | "description" | "required" | "inputId"
> &
  Omit<InputProps, "isInvalid" | "unstyled" | "children" | "className"> & {
    className?: string;
    wrapperClassName?: string;
  };

const EmailField = forwardRef<HTMLInputElement, BaseFieldProps>(
  (props, ref) => {
    const {
      label = "Email",
      hint,
      error,
      description,
      required,
      wrapperClassName = "",
      className = "",
      inputId,
      ...rest
    } = props;

    return (
      <TextField
        label={label}
        hint={hint}
        error={error}
        description={description}
        required={required}
        inputId={inputId}
        className={wrapperClassName}
      >
        <TextField.Input
          ref={ref}
          type="email"
          required={required}
          className={className}
          {...rest}
        />
      </TextField>
    );
  }
);

EmailField.displayName = "EmailField";

interface NumberFieldProps extends BaseFieldProps {
  suffix?: ReactNode;
}

const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  (props, forwardedRef) => {
    const {
      label,
      hint,
      error,
      description,
      required,
      wrapperClassName = "",
      className = "",
      inputId,
      suffix,
      step = 1,
      ...rest
    } = props;
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    const mergedRef = (node: HTMLInputElement | null): void => {
      inputRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (
          forwardedRef as React.MutableRefObject<HTMLInputElement | null>
        ).current = node;
      }
    };

    const isDisabled = Boolean(rest.disabled);

    const fieldClasses = [
      "group flex items-stretch rounded-xl border border-gray-200 bg-white shadow-sm transition-colors",
      "focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500",
      "dark:bg-gray-900 dark:border-gray-700",
      "text-base",
    ];

    if (isDisabled) {
      fieldClasses.push(
        "opacity-70 cursor-not-allowed",
        "dark:text-gray-500",
        "text-gray-500"
      );
    }

    if (error) {
      fieldClasses.push(
        "border-red-500 focus-within:border-red-500 focus-within:ring-red-500"
      );
    }

    return (
      <TextField
        label={label}
        hint={hint}
        error={error}
        description={description}
        required={required}
        inputId={inputId}
        className={wrapperClassName}
      >
        <div className={`${fieldClasses.join(" ")} ${className}`.trim()}>
          <TextField.Input
            ref={mergedRef}
            type="number"
            required={required}
            step={step}
            unstyled
            className={`number-field-input appearance-none flex-1 bg-transparent py-2.5 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none dark:text-gray-100 ${
              suffix ? "text-right pr-1 pl-3" : "text-left px-3"
            }`}
            {...rest}
          />
          {suffix && (
            <span className="flex items-center pl-0 pr-4 text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
              {suffix}
            </span>
          )}
        </div>
      </TextField>
    );
  }
);

NumberField.displayName = "NumberField";

interface PasswordFieldProps extends BaseFieldProps {
  revealToggleAriaLabel?: {
    show: string;
    hide: string;
  };
}

const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  (props, ref) => {
    const {
      label = "Пароль",
      hint,
      error,
      description,
      required,
      wrapperClassName = "",
      className = "",
      inputId,
      revealToggleAriaLabel = {
        show: "Показать пароль",
        hide: "Скрыть пароль",
      },
      ...rest
    } = props;
    const [isVisible, setIsVisible] = useState(false);

    const handleToggle = (): void => {
      setIsVisible((prev) => !prev);
    };

    const toggleLabel = isVisible
      ? revealToggleAriaLabel.hide
      : revealToggleAriaLabel.show;

    return (
      <TextField
        label={label}
        hint={hint}
        error={error}
        description={description}
        required={required}
        inputId={inputId}
        className={wrapperClassName}
      >
        <div className="relative w-full">
          <TextField.Input
            ref={ref}
            type={isVisible ? "text" : "password"}
            required={required}
            className={`pr-12 ${className}`.trim()}
            {...rest}
          />
          <button
            type="button"
            onClick={handleToggle}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
            aria-label={toggleLabel}
          >
            {isVisible ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </TextField>
    );
  }
);

PasswordField.displayName = "PasswordField";

const TextInputField = forwardRef<HTMLInputElement, BaseFieldProps>(
  (props, ref) => {
    const {
      label,
      hint,
      error,
      description,
      required,
      wrapperClassName = "",
      className = "",
      inputId,
      type = "text",
      ...rest
    } = props;

    return (
      <TextField
        label={label}
        hint={hint}
        error={error}
        description={description}
        required={required}
        inputId={inputId}
        className={wrapperClassName}
      >
        <TextField.Input
          ref={ref}
          type={type}
          required={required}
          className={className}
          {...rest}
        />
      </TextField>
    );
  }
);

TextInputField.displayName = "TextInputField";

export {
  Input,
  TextField,
  EmailField,
  NumberField,
  PasswordField,
  TextInputField,
};
