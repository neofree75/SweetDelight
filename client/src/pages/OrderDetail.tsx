import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { ArrowLeft, ShoppingBag, Package, Calendar, FileText, User, Receipt, Undo2 } from 'lucide-react';
import { formatPrice } from '@/lib/format-price';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import QRPayment from '@/components/QRPayment';

interface OrderDetailProps {
  user?: { email: string; name: string; isAdmin?: boolean } | null;
}

export default function OrderDetail({ user }: OrderDetailProps) {
  const [, setLocation] = useLocation();
  const [orderId, setOrderId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<'full' | 'deposit'>('full');

  // Get order ID from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlOrderId = urlParams.get('orderId');
    if (urlOrderId) {
      setOrderId(urlOrderId);
    }
  }, []);

  // Fetch order data from the API
  const { data: orderData, isLoading, error } = useQuery({
    queryKey: ['/api/order/prepare-payment', orderId],
    queryFn: async () => {
      console.log(`[CLIENT] Calling /api/order/prepare-payment with orderId: ${orderId}`);
      const response = await apiRequest('POST', '/api/order/prepare-payment', { orderId });
      console.log(`[CLIENT] API response status: ${response.status}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.log(`[CLIENT] API error response:`, errorData);
        throw new Error(errorData.error || 'Failed to load order');
      }
      const result = await response.json();
      console.log(`[CLIENT] API success response:`, result);
      return result;
    },
    enabled: !!orderId
  });

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

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if dateString contains time (has space and time part)
      if (dateString.includes(' ') && dateString.split(' ').length > 1) {
        return format(date, 'dd.MM.yyyy HH:mm', { locale: sk });
      }
      return format(date, 'dd.MM.yyyy', { locale: sk });
    } catch {
      return dateString;
    }
  };

  // Extract delivery time from delivery_date or orderData
  const getDeliveryTime = () => {
    if (!orderData?.deliveryDate) return null;
    
    // Try to parse time from delivery_date if it's a datetime string
    if (orderData.deliveryDate.includes(' ')) {
      try {
        const dateObj = new Date(orderData.deliveryDate);
        return format(dateObj, 'HH:mm', { locale: sk });
      } catch (e) {
        console.warn(`Could not parse time from delivery_date: ${orderData.deliveryDate}`, e);
      }
    }
    
    return null;
  };

  // Format order status for display
  const formatOrderStatus = (status: string | undefined) => {
    if (!status) return '';
    // Map "To Deliver and Bill" to "Dokončená"
    if (status.toLowerCase().includes('to deliver and bill')) {
      return 'Dokončená';
    }
    return status;
  };

  // Check if payment section should be visible (after 31.12.2025)
  const shouldShowPaymentSection = () => {
    const today = new Date();
    const cutoffDate = new Date('2026-01-01'); // 1.1.2026
    return today >= cutoffDate;
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
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
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
                <h1 className="text-2xl font-serif mb-4">Načítavam objednávku...</h1>
                <p className="text-muted-foreground">
                  Načítavam údaje o objednávke.
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

  if (!orderData || !orderId) {
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
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                setLocation(
                  `/odstupenie-od-zmluvy?orderId=${encodeURIComponent(orderId)}` +
                    (user?.email ? `&email=${encodeURIComponent(user.email)}` : '')
                )
              }
              data-testid="button-withdrawal-from-order"
            >
              <Undo2 className="h-4 w-4" />
              <span className="hidden sm:inline">Odstúpiť od zmluvy</span>
            </Button>
          </header>

          <main className="flex-1 overflow-auto bg-background min-h-0">
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left side - Order summary (wider column) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Order Summary */}
                  <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-serif flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Objednávka #{orderId}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium">{formatOrderStatus(orderData.orderStatus)}</span>
                      </div>
                      
                      {orderData.deliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dátum doručenia:</span>
                          <span>{formatDateTime(orderData.deliveryDate)}</span>
                        </div>
                      )}
                      
                      <Separator />
                      
                      {/* VAT breakdown */}
                      {orderData.amounts.totalWithoutVat !== undefined && (
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Celková suma bez DPH:</span>
                            <span>{formatPrice(orderData.amounts.totalWithoutVat)}</span>
                          </div>
                          {orderData.amounts.totalVat !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">DPH:</span>
                              <span>{formatPrice(orderData.amounts.totalVat)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold pt-1 border-t">
                            <span>Celková suma s DPH:</span>
                            <span>{formatPrice(orderData.amounts.total)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-serif">Položky objednávky</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Mobile view - List */}
                    <div className="space-y-3 md:hidden">
                      {orderData.items.map((item: any, index: number) => {
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
                                {item.itemGroup && (
                                  <p className="text-xs text-muted-foreground">Skupina: {item.itemGroup}</p>
                                )}
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
                    </div>

                    {/* Desktop view - Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium text-sm text-muted-foreground">Položka</th>
                            <th className="text-right p-3 font-medium text-sm text-muted-foreground">Množstvo</th>
                            <th className="text-right p-3 font-medium text-sm text-muted-foreground">Cena bez DPH</th>
                            <th className="text-right p-3 font-medium text-sm text-muted-foreground">DPH</th>
                            <th className="text-right p-3 font-medium text-sm text-muted-foreground">Cena s DPH</th>
                            <th className="text-right p-3 font-medium text-sm text-muted-foreground">Celkom bez DPH</th>
                            <th className="text-right p-3 font-medium text-sm text-muted-foreground">DPH celkom</th>
                            <th className="text-right p-3 font-medium text-sm text-muted-foreground">Celkom s DPH</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderData.items.map((item: any, index: number) => {
                            const netAmount = item.netAmount ?? (item.price * item.quantity);
                            const vatAmount = item.vatAmount ?? (netAmount * (item.vatRate || 0) / 100);
                            const amountWithVat = item.amountWithVat ?? (netAmount + vatAmount);
                            const priceWithoutVat = item.price ?? (item.priceWithVat / (1 + (item.vatRate || 0) / 100));
                            const priceWithVat = item.priceWithVat ?? (priceWithoutVat * (1 + (item.vatRate || 0) / 100));
                            
                            return (
                              <tr key={index} className="border-b hover:bg-muted/30">
                                <td className="p-3">
                                  <div>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-xs text-muted-foreground">Kód: {item.id}</div>
                                    {item.itemGroup && (
                                      <div className="text-xs text-muted-foreground">Skupina: {item.itemGroup}</div>
                                    )}
                                    {item.description && (
                                      <div className="text-xs text-muted-foreground italic mt-1">{item.description}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-right">{item.quantity}</td>
                                <td className="p-3 text-right">{formatPrice(priceWithoutVat)}</td>
                                <td className="p-3 text-right">
                                  {item.vatRate > 0 ? `${item.vatRate}%` : '-'}
                                </td>
                                <td className="p-3 text-right">{formatPrice(priceWithVat)}</td>
                                <td className="p-3 text-right">{formatPrice(netAmount)}</td>
                                <td className="p-3 text-right">
                                  {item.vatRate > 0 ? formatPrice(vatAmount) : '-'}
                                </td>
                                <td className="p-3 text-right font-medium">{formatPrice(amountWithVat)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
                </div>

                {/* Right side - Payment form */}
                {shouldShowPaymentSection() && (
                  <div>
                    {orderData.amounts && (
                      <QRPayment
                        salesOrderId={orderId}
                        paymentMode={paymentAmount}
                        amount={orderData.amounts.total}
                        currency="EUR"
                        onSuccess={() => {}}
                        onError={() => {}}
                        showSubmitButton={false}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

