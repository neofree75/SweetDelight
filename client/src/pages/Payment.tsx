import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Banknote, QrCode, ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/lib/format-price';
import QRPayment from '@/components/QRPayment';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  additional_notes?: string;
  category?: string;
}

export default function Payment() {
  const [, setLocation] = useLocation();
  const [salesOrderId, setSalesOrderId] = useState('');
  const [checkoutData, setCheckoutData] = useState<any>(null);

  useEffect(() => {
    // Get checkout data from localStorage (created by checkout/start API)
    const storedCheckoutData = localStorage.getItem('checkoutData');
    if (storedCheckoutData) {
      const data = JSON.parse(storedCheckoutData);
      setCheckoutData(data);
      setSalesOrderId(data.salesOrderId);
    }

    // Also check URL params for salesOrderId as fallback
    const urlParams = new URLSearchParams(window.location.search);
    const urlSalesOrderId = urlParams.get('salesOrderId');
    if (urlSalesOrderId && !storedCheckoutData) {
      setSalesOrderId(urlSalesOrderId);
    }
  }, []);

  // Use server-provided payment options from checkout data
  const paymentOptions = checkoutData?.paymentOptions || [];
  const amounts = checkoutData?.amounts || { total: 0, deposit: 0, payNow: 0 };

  const handlePaymentSuccess = () => {
    console.log('Payment instructions acknowledged');
    
    // Clear checkout data and redirect to success page with order context
    localStorage.removeItem('cartItems');
    localStorage.removeItem('checkoutData');
    localStorage.removeItem('checkoutItemNotes');
    
    setLocation(`/payment-success?salesOrderId=${salesOrderId}`);
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
  };

  const handleBackToCheckout = () => {
    setLocation('/checkout');
  };

  const handleContinueWithCash = () => {
    // Process cash payment - create order directly
    console.log('Processing cash payment order');
    // TODO: Create order in ERPNext without payment
    setLocation('/order-success');
  };

const formatDate = (dateString?: string) => {
  if (!dateString) {
    return '';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

  if (!checkoutData || !salesOrderId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-serif mb-4">Údaje objednávky sa nenašli</h1>
            <p className="text-muted-foreground mb-8">
              Zdá sa, že sa stratili údaje o vašej objednávke. Začnite prosím znovu.
            </p>
            <Button asChild>
              <a href="/obchod">Späť do obchodu</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleBackToCheckout}
              data-testid="button-back-to-checkout"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-serif">Platba</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left side - Order summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-serif">Súhrn objednávky</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Číslo objednávky:</span>
                      <span className="font-mono text-sm">{salesOrderId}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Celková suma:</span>
                      <span>{formatPrice(amounts.total)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                      <span>K úhrade:</span>
                      <span data-testid="text-final-amount">{formatPrice(amounts.payNow)}</span>
                    </div>
                    {amounts.requiresDeposit && amounts.mode === 'deposit' && (
                      <p className="text-sm text-muted-foreground">
                        Zvyšok {formatPrice(amounts.total - amounts.deposit)} uhradíte pri prevzatí
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-serif">Údaje o doručení</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                <p><strong>Dátum:</strong> {formatDate(checkoutData?.deliveryDate)}</p>
                    <p><strong>Čas:</strong> {checkoutData?.deliveryTime}</p>
                    <p><strong>Platobná metóda:</strong> {
                      (checkoutData?.paymentMethod === 'qr_transfer' || checkoutData?.paymentMethod === 'bank_transfer') ? 'Platba QR kódom / Prevodom' :
                      'Hotovosť pri prevzatí'
                    }</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right side - Payment form */}
            <div>
              {(checkoutData?.paymentMethod === 'qr_transfer' || checkoutData?.paymentMethod === 'bank_transfer') ? (
                <QRPayment
                  salesOrderId={salesOrderId}
                  paymentMode={amounts.mode}
                  amount={amounts.payNow}
                  currency="EUR"
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Banknote className="h-5 w-5" />
                      Hotovosť pri prevzatí
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Suma k úhrade pri prevzatí:</p>
                      <p className="text-xl font-semibold">{formatPrice(amounts.payNow)}</p>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>• Objednávku si môžete vyzdvihnúť v našej predajni</p>
                      <p>• Platbu vykonáte pri prevzatí tovaru</p>
                      <p>• Akceptujeme hotovosť a platobné karty</p>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleContinueWithCash}
                      data-testid="button-confirm-cash-order"
                    >
                      Potvrdiť objednávku
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}