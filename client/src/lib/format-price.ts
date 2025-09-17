/**
 * Formátuje cenu podľa slovenských štandardov:
 * - Čiarka ako oddeľovač desatinných miest
 * - Symbol € za cenou
 * - Locale sk-SK
 */
export function formatPrice(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Formátuje cenu bez symbolu meny - iba číslo s čiarkou ako oddeľovačom
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('sk-SK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}