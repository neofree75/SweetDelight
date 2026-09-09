import { AlertTriangle } from 'lucide-react';
import { ORDERS_PAUSED, PAUSE_BANNER_TITLE, PAUSE_BANNER_TEXT } from '@/lib/order-pause';

/**
 * Informačný pás o dočasnom pozastavení objednávok.
 * Ak ORDERS_PAUSED === false, nevykreslí sa nič.
 */
export default function OrderPauseBanner() {
  if (!ORDERS_PAUSED) return null;

  return (
    <div
      className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50"
      role="status"
      data-testid="banner-orders-paused"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-100">
            <p className="font-semibold">{PAUSE_BANNER_TITLE}</p>
            <p className="mt-0.5">{PAUSE_BANNER_TEXT}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
