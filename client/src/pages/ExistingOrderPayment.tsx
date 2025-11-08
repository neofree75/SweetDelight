import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Banknote, ShoppingBag, Package, Calendar, FileText } from 'lucide-react';
import { formatPrice } from '@/lib/format-price';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import QRPayment from '@/components/QRPayment';
import { apiRequest } from '@/lib/queryClient';

export default function ExistingOrderPayment() {
  const [, setLocation] = useLocation();
  const [orderId, setOrderId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('qr_transfer');
  const [paymentAmount, setPaymentAmount] = useState<'full' | 'deposit'>('full');
  const [orderPaymentData, setOrderPaymentData] = useState<any>(null);

  // Get order ID from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlOrderId = urlParams.get('orderId');
    if (urlOrderId) {
      setOrderId(urlOrderId);
    }

    // Get order payment data from localStorage
    const storedData = localStorage.getItem('orderPaymentData');
    if (storedData) {
      const data = JSON.parse(storedData);
      setOrderPaymentData(data);
    }
  }, []);

  // Fetch payment preparation data from the API
  const { data: paymentData, isLoading, error } = useQuery({
    queryKey: ['/api/order/prepare-payment', orderId],
    queryFn: async () => {
      console.log(`[CLIENT] Calling /api/order/prepare-payment with orderId: ${orderId}`);
      const response = await apiRequest('POST', '/api/order/prepare-payment', { orderId });
      console.log(`[CLIENT] API response status: ${response.status}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.log(`[CLIENT] API error response:`, errorData);
        throw new Error(errorData.error || 'Failed to prepare payment');
      }
      const result = await response.json();
      console.log(`[CLIENT] API success response:`, result);
      return result;
    },
    enabled: !!orderId
  });

  const handlePaymentSuccess = () => {
    console.log('Payment instructions acknowledged');
    
    // Clear stored data and redirect to success page
    localStorage.removeItem('orderPaymentData');
    
    setLocation(`/payment-success?salesOrderId=${orderId}`);
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
  };

  const handleBackToOrders = () => {
    setLocation('/moj-ucet');
  };

  const handleContinueWithCash = () => {
    // For cash payments, we would need to update the order status
    console.log('Processing cash payment order');
    // TODO: Create endpoint to handle cash payment acceptance
    setLocation('/order-success');
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: sk });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <h1 className="text-2xl font-serif mb-4">Pripravujem platbu...</h1>
            <p className="text-muted-foreground">
              Načítavam údaje o objednávke a možnostiach platby.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-serif mb-4">Chyba pri načítaní objednávky</h1>
            <p className="text-muted-foreground mb-8">
              {error instanceof Error ? error.message : 'Nastala chyba pri načítaní objednávky.'}
            </p>
            <Button onClick={handleBackToOrders}>
              Späť na objednávky
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentData || !orderId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-serif mb-4">Objednávka sa nenašla</h1>
            <p className="text-muted-foreground mb-8">
              Zdá sa, že sa stratili údaje o objednávke. Začnite prosím znovu.
            </p>
            <Button onClick={handleBackToOrders}>
              Späť na objednávky
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Get selected payment option based on current selection
  const selectedPaymentOption = paymentData.paymentOptions.find(
    (option: any) => option.id === paymentAmount
  );
  const finalAmount = selectedPaymentOption?.amount || paymentData.amounts.total;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleBackToOrders}
              data-testid="button-back-to-orders"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-serif">Platba objednávky</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left side - Order summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-serif flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Objednávka #{orderId}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">{paymentData.orderStatus}</span>
                    </div>
                    
                    {paymentData.deliveryDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dátum doručenia:</span>
                        <span>{formatDate(paymentData.deliveryDate)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Celková suma:</span>
                      <span>{formatPrice(paymentData.amounts.total)}</span>
                    </div>
                    
                    <div className="flex justify-between text-lg font-semibold">
                      <span>K úhrade:</span>
                      <span data-testid="text-final-amount">{formatPrice(finalAmount)}</span>
                    </div>
                    
                    {paymentAmount === 'deposit' && paymentData.amounts.requiresDeposit && (
                      <p className="text-sm text-muted-foreground">
                        Zaplatíte zálohu {formatPrice(paymentData.amounts.deposit)}. 
                        Zostatok {formatPrice(paymentData.amounts.total - paymentData.amounts.deposit)} uhradíte pri prevzatí.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-serif">Položky objednávky</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {paymentData.items.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                      <div className="flex-1">
                        <h5 className="font-medium">{item.name}</h5>
                        <p className="text-sm text-muted-foreground">Kód: {item.id}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {item.quantity} × {formatPrice(item.priceWithVat ?? item.price)}
                        </div>
                        <div className="font-semibold">
                          {formatPrice((item.priceWithVat ?? item.price) * item.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Payment Options */}
              {paymentData.paymentOptions.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-serif">Možnosti platby</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup 
                      value={paymentAmount} 
                      onValueChange={(value: 'full' | 'deposit') => setPaymentAmount(value)}
                    >
                      {paymentData.paymentOptions.map((option: any) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.id} id={option.id} />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                            <div>
                              <p className="font-medium">{option.label}</p>
                              <p className="text-sm text-muted-foreground">{option.description}</p>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right side - Payment form */}
            <div>
              {(paymentMethod === 'qr_transfer' || paymentMethod === 'bank_transfer') ? (
                <QRPayment
                  salesOrderId={orderId}
                  paymentMode={paymentAmount}
                  amount={finalAmount}
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