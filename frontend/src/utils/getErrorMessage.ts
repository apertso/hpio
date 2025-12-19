import { AxiosError } from "axios";

const NETWORK_ERROR_MESSAGE =
  "Нет подключения к интернету. Проверьте соединение и повторите попытку.";
const NETWORK_ERROR_CODES = new Set(["ERR_NETWORK", "ECONNABORTED"]);
const NETWORK_MESSAGE_PATTERNS = [
  "network error",
  "net::err_internet_disconnected",
  "failed to fetch",
  "load failed",
  "connection terminated",
  "connection aborted",
  "connection closed",
];

const isNetworkMessage = (message?: string): boolean => {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return NETWORK_MESSAGE_PATTERNS.some((pattern) =>
    normalized.includes(pattern)
  );
};

const isNetworkError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    if (!error.response && NETWORK_ERROR_CODES.has(error.code || "")) {
      return true;
    }
    return isNetworkMessage(error.message);
  }
  if (error instanceof Error) {
    return isNetworkMessage(error.message);
  }
  return false;
};

export default function getErrorMessage(error: unknown): string {
  if (!navigator.onLine || isNetworkError(error)) {
    return NETWORK_ERROR_MESSAGE;
  }
  if (error instanceof AxiosError && error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Произошла неизвестная ошибка.";
}
