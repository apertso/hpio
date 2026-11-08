import { translate, type Language } from "../i18n/translate";

interface NamedCategory {
  name: string;
  nameEn?: string | null;
}

export function localizedCategoryName(
  category: NamedCategory,
  language: Language
): string {
  if (language === "en") {
    const englishName = category.nameEn?.trim();
    if (englishName) return englishName;
    return translate("en", category.name);
  }
  return category.name;
}
