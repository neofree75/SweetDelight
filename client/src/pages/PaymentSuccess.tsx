import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Clock, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/format-price';
import SEO from '@/components/SEO';

interface PaymentSuccessProps {
  onClearCart?: () => void;
}

export default function PaymentSuccess({ onClearCart }: PaymentSuccessProps) {
  const [, setLocation] = useLocation();
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    // Get order details from checkout data or URL params BEFORE clearing
    const storedCheckoutData = localStorage.getItem('checkoutData');
    const urlParams = new URLSearchParams(window.location.search);
    const salesOrderId = urlParams.get('salesOrderId');
    
    if (storedCheckoutData) {
      const checkoutData = JSON.parse(storedCheckoutData);
      setOrderDetails({
        salesOrderId: checkoutData.salesOrderId,
        amount: checkoutData.amounts?.payNow,
        paymentMode: checkoutData.amounts?.mode,
        timestamp: new Date()
      });
    } else if (salesOrderId) {
      setOrderDetails({
        salesOrderId,
        timestamp: new Date()
      });
    }
    
    // Clear cart after successful order creation
    if (onClearCart) {
      onClearCart();
    }
    
    // Clear cart and checkout data after reading the details
    localStorage.removeItem('cartItems');
    localStorage.removeItem('checkoutData');
    localStorage.removeItem('checkoutItemNotes');
  }, [onClearCart]);

  const handleContinueShopping = () => {
    setLocation('/obchod');
  };

  const handleViewAccount = () => {
    setLocation('/moj-ucet?section=objednavky');
  };

  return (
    <>
      <SEO 
        title={`Potvrdenie objednávky | Marsela Bakery`}
        description="Vaša objednávka bola úspešne zaznamenaná. Ďakujeme za vašu objednávku."
        canonical="/payment-success"
      />
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-serif text-green-800 mb-2">
              Objednávka zaznamenaná
            </h1>
            <p className="text-muted-foreground">
              Ďakujeme za vašu objednávku. Pokyny na platbu sme uložili a objednávku spracujeme po prijatí platby.
            </p>
          </div>

          {/* Order Confirmation Card */}
          <Card className="mb-6" data-testid="order-confirmation">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Package className="h-5 w-5" />
                Potvrdenie objednávky
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderDetails?.salesOrderId && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Číslo objednávky:</span>
                  <span className="font-mono text-sm font-semibold">
                    {orderDetails.salesOrderId}
                  </span>
                </div>
              )}
              
              {orderDetails?.amount && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Uhradená suma:</span>
                  <span className="font-semibold text-lg">
                    {formatPrice(orderDetails.amount)}
                  </span>
                </div>
              )}
              
              {orderDetails?.paymentMode === 'deposit' && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Záloha uhradená.</strong> Zostatok uhradíte pri prevzatí objednávky.
                  </p>
                </div>
              )}
              
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-800">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Čo bude ďalej?</span>
                </div>
                <p className="text-sm text-green-700 mt-2">
                  Vaša objednávka bola odoslaná do našej cukrárňe. 
                  Pripravíme ju podľa zadaného dátumu a času doručenia.
                  O stave objednávky vás budeme informovať e-mailom.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleContinueShopping}
              data-testid="button-continue-shopping"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Pokračovať v nákupe
            </Button>
            
            <Button 
              className="w-full"
              onClick={handleViewAccount}
              data-testid="button-view-account"
            >
              <Package className="mr-2 h-4 w-4" />
              Zobraziť moje objednávky
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Potrebujete pomoc? Kontaktujte nás na{' '}
              <a href="mailto:marselabakery@gmail.com" className="text-primary underline">
                marselabakery@gmail.com
              </a>{' '}
              alebo na telefóne{' '}
              <a href="tel:+421917795731" className="text-primary underline">
                +421 917 795 731
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}