export const getVendorDisplayName = (vendor?: string | null): string | null => {
  if (!vendor) return null;

  const trimmed = vendor.trim();
  if (!trimmed) return null;

  return trimmed;
};
