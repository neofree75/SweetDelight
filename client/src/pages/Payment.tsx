import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CreditCard, Banknote, ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/lib/format-price';
import { calculateDeposit, getPaymentOptions } from '@/lib/deposit-utils';
import StripeCheckout from '@/components/StripeCheckout';

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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentAmount, setPaymentAmount] = useState<'full' | 'deposit'>('full');
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);

  useEffect(() => {
    // Get cart items from localStorage
    const storedItems = localStorage.getItem('cartItems');
    if (storedItems) {
      const items = JSON.parse(storedItems);
      setCartItems(items);
    }

    // Get checkout data from URL params
    const urlParams = new URLSearchParams(window.location.search);
    setDeliveryDate(urlParams.get('date') || '');
    setDeliveryTime(urlParams.get('time') || '');
    setPaymentMethod(urlParams.get('payment') || 'card');
    setPaymentAmount(urlParams.get('amount') as 'full' | 'deposit' || 'full');
  }, []);

  // Calculate deposit information - map cart items to include category detection
  const itemsWithCategories = cartItems.map(item => ({
    ...item,
    category: item.id === 'TORTCUS001' || item.name === 'Torta na mieru' || item.id.startsWith('custom-cake-') 
      ? 'Torty na mieru' 
      : item.id.startsWith('TORT') || (item.name && item.name.toLowerCase().includes('torta'))
      ? 'Torty'
      : 'Zákusky'
  }));

  const depositCalculation = calculateDeposit(itemsWithCategories);
  const paymentOptions = getPaymentOptions(depositCalculation);
  const selectedPaymentOption = paymentOptions.find(option => option.id === paymentAmount);
  const finalAmount = selectedPaymentOption?.amount || depositCalculation.subtotal;

  const handlePaymentSuccess = (paymentIntent: any) => {
    console.log('Payment successful:', paymentIntent);
    
    // Clear cart and redirect to success page
    localStorage.removeItem('cartItems');
    localStorage.removeItem('checkoutItemNotes');
    
    setLocation('/payment-success');
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
  };

  const handleBackToCheckout = () => {
    setLocation('/objednavka');
  };

  const handleContinueWithCash = () => {
    // Process cash payment - create order directly
    console.log('Processing cash payment order');
    // TODO: Create order in ERPNext without payment
    setLocation('/order-success');
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-serif mb-4">Košík je prázdny</h1>
            <p className="text-muted-foreground mb-8">
              Zdá sa, že sa stratili údaje o vašej objednávke.
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
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <img 
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-md"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Medzisúčet:</span>
                      <span>{formatPrice(depositCalculation.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                      <span>K úhrade:</span>
                      <span data-testid="text-final-amount">{formatPrice(finalAmount)}</span>
                    </div>
                    {paymentAmount === 'deposit' && (
                      <p className="text-sm text-muted-foreground">
                        Zvyšok {formatPrice(depositCalculation.subtotal - finalAmount)} uhradíte pri prevzatí
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
                    <p><strong>Dátum:</strong> {deliveryDate}</p>
                    <p><strong>Čas:</strong> {deliveryTime}</p>
                    <p><strong>Platobná metóda:</strong> {paymentMethod === 'card' ? 'Platobná karta' : 'Hotovosť pri prevzatí'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right side - Payment form */}
            <div>
              {paymentMethod === 'card' ? (
                <StripeCheckout
                  amount={finalAmount}
                  currency="eur"
                  metadata={{
                    deliveryDate,
                    deliveryTime,
                    paymentType: paymentAmount,
                    itemCount: cartItems.length.toString()
                  }}
                  orderData={{
                    items: cartItems,
                    deliveryDate,
                    deliveryTime,
                    paymentAmount,
                    total: finalAmount
                  }}
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
                      <p className="text-xl font-semibold">{formatPrice(finalAmount)}</p>
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