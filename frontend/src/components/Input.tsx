import { useLanguage } from "../context/LanguageContext";
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
import { useUiSurface } from "../context/UiSurfaceContext";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  isInvalid?: boolean;
  unstyled?: boolean;
}

// Стили поля ввода рабочего интерфейса (компактные, нейтральные)
const APP_INPUT_CLASSES = [
  "block",
  "w-full",
  "min-w-0",
  "max-w-[64em]",
  "rounded-md",
  "bg-white",
  "border",
  "border-gray-200",
  "px-2.5",
  "h-9",
  "md:h-8",
  "text-sm",
  "text-gray-900",
  "placeholder:text-gray-400",
  "shadow-sm",
  "transition-colors",
  "hover:border-gray-300",
  "focus:outline-none",
  "focus:border-indigo-500",
  "focus:ring-2",
  "focus:ring-indigo-500/25",
  "dark:bg-white/[0.03]",
  "dark:border-white/10",
  "dark:hover:border-white/20",
  "dark:focus:border-indigo-500",
  "dark:text-gray-100",
  "dark:placeholder:text-gray-500",
];
const APP_DISABLED_CLASSES = [
  "bg-gray-50",
  "text-gray-500",
  "opacity-60",
  "cursor-not-allowed",
  "dark:text-gray-500",
];
const APP_INVALID_CLASSES = [
  "border-red-500",
  "dark:border-red-500",
  "focus:ring-2",
  "focus:ring-red-500/25",
  "focus:border-red-500",
];

// Прежние стили для индексируемых публичных страниц
const LEGACY_INPUT_CLASSES = [
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
const LEGACY_DISABLED_CLASSES = [
  "bg-gray-100",
  "text-gray-500",
  "opacity-70",
  "cursor-not-allowed",
  "dark:bg-gray-900",
  "dark:text-gray-500",
];
const LEGACY_INVALID_CLASSES = [
  "border-red-500",
  "focus:ring-2",
  "focus:ring-red-500",
  "focus:border-red-500",
];

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
  const surface = useUiSurface();
  const isLegacy = surface === "public";
  const baseClasses = skipStyling
    ? []
    : [...(isLegacy ? LEGACY_INPUT_CLASSES : APP_INPUT_CLASSES)];

  if (!skipStyling && disabled) {
    baseClasses.push(
      ...(isLegacy ? LEGACY_DISABLED_CLASSES : APP_DISABLED_CLASSES)
    );
  }

  if (!skipStyling && isInvalid) {
    baseClasses.push(
      ...(isLegacy ? LEGACY_INVALID_CLASSES : APP_INVALID_CLASSES)
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
  const { t } = useLanguage();
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
  const isLegacy = useUiSurface() === "public";
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
        className={`flex w-full max-w-[64em] flex-col ${isLegacy ? "gap-2" : "gap-1.5"} ${className}`.trim()}
        {...rest}
      >
        {label && (
          <label
            htmlFor={fieldId}
            className={`text-sm font-medium ${isLegacy ? "text-gray-700" : "text-gray-800"} dark:text-gray-200`}
          >
            {label}
          </label>
        )}
        {children}
        {description && (
          <p
            id={descriptionId}
            className={isLegacy ? "text-sm text-gray-600 dark:text-gray-400" : "text-xs text-gray-500 dark:text-gray-400"}
          >
            {description}
          </p>
        )}
        {hint && (
          <p id={hintId} className={`${isLegacy ? "text-sm" : "text-xs"} text-gray-500 dark:text-gray-400`}>
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className={isLegacy ? "text-sm text-red-500" : "text-xs text-red-600 dark:text-red-400"}>
            {typeof error === "string" ? t(error) : error}
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
      className={`text-sm font-medium text-gray-800 dark:text-gray-200 ${className}`.trim()}
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
      "group flex items-stretch rounded-md border border-gray-200 bg-white shadow-sm transition-colors hover:border-gray-300",
      "focus-within:ring-2 focus-within:ring-indigo-500/25 focus-within:border-indigo-500",
      "dark:bg-white/[0.03] dark:border-white/10 dark:hover:border-white/20 dark:focus-within:border-indigo-500",
      "text-sm h-9 md:h-8",
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
        "border-red-500 dark:border-red-500 focus-within:border-red-500 focus-within:ring-red-500/25"
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
            className={`number-field-input appearance-none flex-1 min-w-0 bg-transparent text-sm tabular-nums text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 ${
              suffix ? "text-right pr-1 pl-2.5" : "text-left px-2.5"
            }`}
            {...rest}
          />
          {suffix && (
            <span className="flex items-center pl-0 pr-2.5 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
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
  const { t } = useLanguage();
    const {
      label = t("Пароль"),
      hint,
      error,
      description,
      required,
      wrapperClassName = "",
      className = "",
      inputId,
      revealToggleAriaLabel = {
        show: t("Показать пароль"),
        hide: t("Скрыть пароль"),
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
            className={`pr-10 ${className}`.trim()}
            {...rest}
          />
          <button
            type="button"
            onClick={handleToggle}
            className="absolute inset-y-0 right-0 flex min-w-9 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 motion-reduce:transition-none dark:text-gray-400 dark:hover:text-gray-100"
            aria-label={toggleLabel}
          >
            {isVisible ? (
              <EyeSlashIcon className="size-4" />
            ) : (
              <EyeIcon className="size-4" />
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
