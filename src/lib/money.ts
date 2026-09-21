const EGP_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EGP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatEGP(amount: number): string {
  return EGP_FORMATTER.format(amount);
}

export function formatLatinNumber(value: number): string {
  return value.toLocaleString('en-US');
}
