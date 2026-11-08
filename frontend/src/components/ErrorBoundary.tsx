import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLanguage } from "../context/LanguageContext";
import { logStructuredError } from "../utils/fileLogger";
import logger from "../utils/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary для перехвата ошибок рендеринга React
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error("React Error Boundary caught error:", error, errorInfo);

    logStructuredError("JS_ERROR", error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback />;
    }

    return this.props.children;
  }
}

function ErrorFallback(): ReactNode {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-dark-bg">
      <div className="max-w-md p-6 bg-white dark:bg-card-bg rounded-lg shadow-lg border border-gray-200 dark:border-border-dark">
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
          {t("Произошла ошибка")}
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {t("Приложение столкнулось с неожиданной ошибкой. Пожалуйста, перезапустите приложение.")}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="primary-action cursor-pointer w-full px-4 py-2 rounded-md transition-colors"
        >
          {t("Перезагрузить приложение")}
        </button>
      </div>
    </div>
  );
}

export default ErrorBoundary;
