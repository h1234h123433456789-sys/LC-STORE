export function formatPrice(amount: number | undefined | null, _currency?: 'USD' | 'IQD' | string): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : Number(amount) || 0;
  // If an old legacy item had USD values (<= 500), convert it using the standard 1320 rate
  const iqdAmount = num > 0 && num <= 500 ? Math.round(num * 1320) : Math.round(num);
  try {
    return `${iqdAmount.toLocaleString('ar-IQ')} د.ع`;
  } catch {
    return `${iqdAmount} د.ع`;
  }
}

export function formatDateTime(isoString: string | undefined | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(isoString);
  }
}

