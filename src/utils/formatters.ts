export function toIQD(amount: number | undefined | null): number {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : Number(amount) || 0;
  return num > 0 && num <= 500 ? Math.round(num * 1320) : Math.round(num);
}

export function formatPrice(amount: number | undefined | null, _currency?: 'USD' | 'IQD' | string): string {
  const iqdAmount = toIQD(amount);
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

