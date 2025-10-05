export function normalizeMerchantName(merchantName: string): string {
  let normalized = merchantName.toLowerCase();

  normalized = normalized.trim();

  normalized = normalized.replace(/[^a-zа-яё\s]/gi, "");

  normalized = normalized.replace(/\s+/g, " ");

  normalized = normalized.trim();

  return normalized;
}
