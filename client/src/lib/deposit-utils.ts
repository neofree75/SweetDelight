interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  additional_notes?: string;
  category?: string;
}

interface DepositCalculation {
  subtotal: number;
  depositAmount: number;
  depositPercentage: number;
  requiresDeposit: boolean;
  reason: 'none' | 'high_total' | 'contains_cake' | 'contains_custom_cake';
}

/**
 * Calculates deposit amount based on order total and product categories
 * 
 * Rules:
 * - If total > 150 € → deposit = 50% 
 * - If order contains "Torta" or "Torta na mieru" category → deposit = 50% (regardless of total)
 * - Otherwise → deposit = 0 €
 */
export function calculateDeposit(cartItems: CartItem[]): DepositCalculation {
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Check if any item contains cake categories
  const containsTorta = cartItems.some(item => 
    item.category === 'Torty' || 
    item.category === 'Torta na mieru' ||
    item.category === 'Torty na mieru'
  );
  
  // Check if any item is a custom cake (by name or ID pattern)
  const containsCustomCake = cartItems.some(item => 
    item.name === 'Torta na mieru' ||
    item.id.startsWith('custom-cake-') ||
    item.category === 'Torty na mieru'
  );
  
  let requiresDeposit = false;
  let reason: DepositCalculation['reason'] = 'none';
  
  if (containsCustomCake) {
    requiresDeposit = true;
    reason = 'contains_custom_cake';
  } else if (containsTorta) {
    requiresDeposit = true;
    reason = 'contains_cake';
  } else if (subtotal > 150) {
    requiresDeposit = true;
    reason = 'high_total';
  }
  
  const depositPercentage = requiresDeposit ? 50 : 0;
  const depositAmount = requiresDeposit ? subtotal * 0.5 : 0;
  
  return {
    subtotal,
    depositAmount,
    depositPercentage,
    requiresDeposit,
    reason
  };
}

/**
 * Get user-friendly text explaining why deposit is required
 */
export function getDepositReason(reason: DepositCalculation['reason']): string {
  switch (reason) {
    case 'high_total':
      return 'Objednávka presahuje 150 €';
    case 'contains_cake':
      return 'Objednávka obsahuje tortu';
    case 'contains_custom_cake':
      return 'Objednávka obsahuje tortu na mieru';
    default:
      return '';
  }
}

/**
 * Get payment options for display in UI
 */
export function getPaymentOptions(depositCalculation: DepositCalculation) {
  const { subtotal, depositAmount, requiresDeposit } = depositCalculation;
  
  if (!requiresDeposit) {
    return [
      {
        id: 'full',
        label: 'Uhradiť celú sumu',
        amount: subtotal,
        description: 'Celková platba'
      }
    ];
  }
  
  return [
    {
      id: 'deposit',
      label: 'Uhradiť zálohu (50%)',
      amount: depositAmount,
      description: `Záloha ${depositAmount.toFixed(2)} € z celkovej sumy ${subtotal.toFixed(2)} €`
    },
    {
      id: 'full',
      label: 'Uhradiť celú sumu',
      amount: subtotal,
      description: `Celková platba ${subtotal.toFixed(2)} €`
    }
  ];
}

/**
 * Get payment methods available for the user
 */
export function getPaymentMethods() {
  return [
    {
      id: 'qr_transfer',
      label: 'Platba QR kódom / Prevodom',
      description: 'Platba bankovým prevodom pomocou QR kódu',
      icon: 'qr_code',
      default: true
    },
    {
      id: 'card',
      label: 'Platba kartou',
      description: 'Online platba debetnou alebo kreditnou kartou',
      icon: 'credit_card',
      default: false
    },
    {
      id: 'cash',
      label: 'Dobierka',
      description: 'Platba v hotovosti pri doručení',
      icon: 'cash',
      default: false
    }
  ];
}