import english from "./en.json";

export const locales = { ru: "ru-RU", en: "en-US" } as const;
export type Language = keyof typeof locales;

const messages: Readonly<Record<string, string>> = english;

export function isLanguage(value: unknown): value is Language {
  return value === "ru" || value === "en";
}

export function translate(language: Language, message: string, ...values: unknown[]): string {
  const text =
    language === "en" && Object.prototype.hasOwnProperty.call(messages, message)
      ? messages[message]
      : message;
  return values.length
    ? text.replace(/\{(\d+)\}/g, (placeholder, index: string) => {
        const position = Number(index) - 1;
        return position >= 0 && position < values.length
          ? String(values[position])
          : placeholder;
      })
    : text;
}
