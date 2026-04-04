export const getCardFallbackName = (pan?: string | null): string => {
  const cleanedPan = pan?.replace(/\s/g, "") ?? "";
  const last4 = cleanedPan.length >= 4 ? cleanedPan.slice(-4) : "";
  return last4 ? `Карта *${last4}` : "Карта";
};

export const getCardDisplayName = (
  name?: string | null,
  pan?: string | null
): string => {
  const trimmedName = name?.trim();
  if (trimmedName) {
    return trimmedName;
  }
  return getCardFallbackName(pan);
};
