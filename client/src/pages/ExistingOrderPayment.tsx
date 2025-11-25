import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from '@/components/ui/sidebar';
import { ArrowLeft, Banknote, ShoppingBag, Package, Calendar, FileText, User, Receipt } from 'lucide-react';
import { formatPrice } from '@/lib/format-price';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import QRPayment from '@/components/QRPayment';
import { apiRequest } from '@/lib/queryClient';

interface ExistingOrderPaymentProps {
  user?: { email: string; name: string } | null;
}

export default function ExistingOrderPayment({ user }: ExistingOrderPaymentProps) {
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
    setLocation('/moj-ucet?section=objednavky');
  };


  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: sk });
    } catch {
      return dateString;
    }
  };

  const menuItems = [
    {
      id: 'profil',
      label: 'Môj profil',
      icon: User,
      path: '/moj-ucet?section=profil',
    },
    {
      id: 'objednavky', 
      label: 'Objednávky',
      icon: FileText,
      path: '/moj-ucet?section=objednavky',
    },
    {
      id: 'faktury',
      label: 'Faktúry', 
      icon: Receipt,
      path: '/moj-ucet?section=faktury',
    },
  ];

  // Custom sidebar width for account page
  const style = {
    "--sidebar-width": "16rem",       // 256px for account navigation
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  if (isLoading) {
    return (
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-full w-full">
          <Sidebar variant="inset" collapsible="icon">
            <SidebarContent>
              <SidebarGroup className="pt-4">
                <SidebarGroupLabel>Môj účet</SidebarGroupLabel>
                <SidebarGroupContent className="mt-4">
                  <SidebarMenu>
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setLocation(item.path)}
                          data-testid={`button-account-${item.id}`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          
          <div className="flex flex-col flex-1 h-full min-h-0">
            <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
              <SidebarTrigger />
              <h1 className="text-lg font-playfair">Detail objednávky</h1>
              <div></div>
            </header>
            
            <main className="flex-1 overflow-auto bg-background min-h-0 p-6">
              <div className="text-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
                <h1 className="text-2xl font-serif mb-4">Pripravujem platbu...</h1>
                <p className="text-muted-foreground">
                  Načítavam údaje o objednávke a možnostiach platby.
                </p>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (error) {
    return (
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-full w-full">
          <Sidebar variant="inset" collapsible="icon">
            <SidebarContent>
              <SidebarGroup className="pt-4">
                <SidebarGroupLabel>Môj účet</SidebarGroupLabel>
                <SidebarGroupContent className="mt-4">
                  <SidebarMenu>
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setLocation(item.path)}
                          data-testid={`button-account-${item.id}`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          
          <div className="flex flex-col flex-1 h-full min-h-0">
            <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
              <SidebarTrigger />
              <h1 className="text-lg font-playfair">Detail objednávky</h1>
              <div></div>
            </header>
            
            <main className="flex-1 overflow-auto bg-background min-h-0 p-6">
              <div className="text-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-2xl font-serif mb-4">Chyba pri načítaní objednávky</h1>
                <p className="text-muted-foreground mb-8">
                  {error instanceof Error ? error.message : 'Nastala chyba pri načítaní objednávky.'}
                </p>
                <Button onClick={handleBackToOrders}>
                  Späť na objednávky
                </Button>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!paymentData || !orderId) {
    return (
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-full w-full">
          <Sidebar variant="inset" collapsible="icon">
            <SidebarContent>
              <SidebarGroup className="pt-4">
                <SidebarGroupLabel>Môj účet</SidebarGroupLabel>
                <SidebarGroupContent className="mt-4">
                  <SidebarMenu>
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setLocation(item.path)}
                          data-testid={`button-account-${item.id}`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          
          <div className="flex flex-col flex-1 h-full min-h-0">
            <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
              <SidebarTrigger />
              <h1 className="text-lg font-playfair">Detail objednávky</h1>
              <div></div>
            </header>
            
            <main className="flex-1 overflow-auto bg-background min-h-0 p-6">
              <div className="text-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-2xl font-serif mb-4">Objednávka sa nenašla</h1>
                <p className="text-muted-foreground mb-8">
                  Zdá sa, že sa stratili údaje o objednávke. Začnite prosím znovu.
                </p>
                <Button onClick={handleBackToOrders}>
                  Späť na objednávky
                </Button>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Get selected payment option based on current selection
  const selectedPaymentOption = paymentData.paymentOptions.find(
    (option: any) => option.id === paymentAmount
  );
  const finalAmount = selectedPaymentOption?.amount || paymentData.amounts.total;

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-full w-full">
        <Sidebar variant="inset" collapsible="icon">
          <SidebarContent>
            <SidebarGroup className="pt-4">
              <SidebarGroupLabel>Môj účet</SidebarGroupLabel>
              <SidebarGroupContent className="mt-4">
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setLocation(item.path)}
                        isActive={item.id === 'objednavky'}
                        data-testid={`button-account-${item.id}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <div className="flex flex-col flex-1 h-full min-h-0">
          <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleBackToOrders}
                data-testid="button-back-to-orders"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <h1 className="text-lg font-playfair">Detail objednávky</h1>
            <div></div>
          </header>
          
          <main className="flex-1 overflow-auto bg-background min-h-0">
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side - Order summary (wider column) */}
            <div className="lg:col-span-2 space-y-6">
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
                    
                    <Separator />
                    
                    {/* VAT breakdown */}
                    {paymentData.amounts.totalWithoutVat !== undefined && (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Celková suma bez DPH:</span>
                          <span>{formatPrice(paymentData.amounts.totalWithoutVat)}</span>
                        </div>
                        {paymentData.amounts.totalVat !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">DPH:</span>
                            <span>{formatPrice(paymentData.amounts.totalVat)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold pt-1 border-t">
                          <span>Celková suma s DPH:</span>
                          <span>{formatPrice(paymentData.amounts.total)}</span>
                        </div>
                      </div>
                    )}
                    
                    <Separator />
                    
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
                  {paymentData.items.map((item: any, index: number) => {
                    const netAmount = item.netAmount ?? (item.price * item.quantity);
                    const vatAmount = item.vatAmount ?? (netAmount * (item.vatRate || 0) / 100);
                    const amountWithVat = item.amountWithVat ?? (netAmount + vatAmount);
                    const priceWithoutVat = item.price ?? (item.priceWithVat / (1 + (item.vatRate || 0) / 100));
                    const priceWithVat = item.priceWithVat ?? (priceWithoutVat * (1 + (item.vatRate || 0) / 100));
                    
                    return (
                      <div key={index} className="p-3 rounded-md bg-muted/30 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium">{item.name}</h5>
                            <p className="text-sm text-muted-foreground">Kód: {item.id}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground italic mt-1">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              {item.quantity} × {formatPrice(priceWithVat)}
                            </div>
                            <div className="font-semibold">
                              {formatPrice(amountWithVat)}
                            </div>
                          </div>
                        </div>
                        {/* VAT breakdown for each item */}
                        <div className="pt-2 border-t border-muted text-xs space-y-1">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Cena bez DPH:</span>
                            <span>{formatPrice(priceWithoutVat)}</span>
                          </div>
                          {item.vatRate > 0 && (
                            <div className="flex justify-between text-muted-foreground">
                              <span>DPH ({item.vatRate}%):</span>
                              <span>{formatPrice(vatAmount / item.quantity)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-muted-foreground">
                            <span>Cena s DPH:</span>
                            <span>{formatPrice(priceWithVat)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground pt-1 border-t border-muted">
                            <span>Celkom bez DPH:</span>
                            <span>{formatPrice(netAmount)}</span>
                          </div>
                          {item.vatRate > 0 && (
                            <div className="flex justify-between text-muted-foreground">
                              <span>DPH celkom:</span>
                              <span>{formatPrice(vatAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium text-foreground">
                            <span>Celkom s DPH:</span>
                            <span>{formatPrice(amountWithVat)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                  showSubmitButton={false}
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
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                        ✓ Objednávka je pripravená
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Vaša objednávka #{orderId} bola úspešne vytvorená a je pripravená na vyzdvihnutie.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Suma k úhrade pri prevzatí:</p>
                      <p className="text-xl font-semibold">{formatPrice(finalAmount)}</p>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>• Objednávku si môžete vyzdvihnúť v našej predajni</p>
                      <p>• Platbu vykonáte pri prevzatí tovaru</p>
                      <p>• Akceptujeme hotovosť a platobné karty</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}