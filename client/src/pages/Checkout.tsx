import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, Clock, CreditCard, Banknote, QrCode, ShoppingBag, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/format-price';
import { calculateDeposit, getDepositReason, getPaymentOptions, getPaymentMethods } from '@/lib/deposit-utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { CartItem } from '@shared/schema';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CheckoutProps {
  cartItems: CartItem[];
  onClearCart?: () => void;
}

export default function Checkout({ cartItems, onClearCart }: CheckoutProps) {
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('qr_transfer');
  const [paymentAmount, setPaymentAmount] = useState<'full' | 'deposit'>('full');
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user profile if logged in
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['/api/profile'],
    queryFn: getQueryFn<{ success: boolean; data?: any }>({ on401: 'returnNull' }),
    staleTime: 300000,
    retry: false,
    refetchOnWindowFocus: false
  });

  const subtotalWithoutVat = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const subtotalWithVat = cartItems.reduce((sum, item) => sum + (item.priceWithVat * item.quantity), 0);
  const totalVat = subtotalWithVat - subtotalWithoutVat;
  const discount = 0; // Implementované neskôr s kupónmi
  const total = subtotalWithVat - discount;
  
  // Calculate deposit information - map cart items to include category detection
  const itemsWithCategories = cartItems.map(item => ({
    ...item,
    // Detect category based on item properties
    category: item.id === 'TORTCUS001' || item.name === 'Torta na mieru' || item.id.startsWith('custom-cake-') 
      ? 'Torty na mieru' 
      : item.id.startsWith('TORT') || (item.name && item.name.toLowerCase().includes('torta'))
      ? 'Torty'
      : 'Zákusky'
  }));
  const depositCalculation = calculateDeposit(itemsWithCategories);
  const paymentOptions = getPaymentOptions(depositCalculation);
  const selectedPaymentOption = paymentOptions.find(option => option.id === paymentAmount);
  const finalAmount = selectedPaymentOption?.amount || total;

  // Funkcia pre aktualizáciu poznámok k položkám
  const updateItemNote = (itemId: string, note: string) => {
    setItemNotes(prev => ({
      ...prev,
      [itemId]: note
    }));
  };

  const handleSubmitOrder = async () => {
    // Validácia povinných polí
    if (!deliveryDate || !deliveryTime) {
      toast({
        title: "Chyba",
        description: "Prosím vyplňte dátum a čas doručenia",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Pridať poznámky k položkám - zachovať existujúce additional_notes a pridať nové ak sú zadané
      const cartItemsWithNotes = cartItems.map(item => {
        const existingNotes = item.additional_notes || '';
        const newNotes = itemNotes[item.id] || '';
        const combinedNotes = existingNotes && newNotes 
          ? `${existingNotes}, ${newNotes}` 
          : existingNotes || newNotes;
          
        return {
          ...item,
          additional_notes: combinedNotes,
          // Add category detection for server-side processing
          category: item.id === 'TORTCUS001' || item.name === 'Torta na mieru' || item.id.startsWith('custom-cake-') 
            ? 'Torty na mieru' 
            : item.id.startsWith('TORT') || (item.name && item.name.toLowerCase().includes('torta'))
            ? 'Torty'
            : 'Zákusky'
        };
      });

      // Počkať ak sa ešte načítava profil
      if (isProfileLoading) {
        // Skús načítať profil priamo
        try {
          const directResponse = await fetch('/api/profile', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (directResponse.ok) {
            const directData = await directResponse.json();
            if (directData.success && directData.data) {
              // Použi načítané dáta
              const profileData = directData.data || {};
              const customerInfo = {
                firstName: profileData.firstName || profileData.customerName || profileData.name || 'Guest',
                lastName: profileData.lastName || 'Customer',
                email: profileData.email || 'guest@marsela.sk',
                phone: profileData.mobile || '+421000000000'
              };
              
              const deliveryInfo = {
                date: deliveryDate,
                time: deliveryTime
              };

              // Call checkout/start API to create Sales Order first
              const res = await apiRequest('POST', '/api/checkout/start', {
                cartItems: cartItemsWithNotes,
                customerInfo,
                deliveryInfo,
                paymentMethod,
                paymentAmount
              });

              const response = await res.json();

              if (!response.success) {
                throw new Error(response.error || 'Failed to start checkout process');
              }

              const { salesOrderId, amounts, paymentOptions } = response;

              console.log('Sales Order created:', salesOrderId, 'amounts:', amounts);

              // Clear cart after successful order creation
              if (onClearCart) {
                onClearCart();
              }

              // Store checkout data for payment page
              const checkoutData = {
                salesOrderId,
                amounts,
                paymentOptions,
                deliveryDate,
                deliveryTime,
                paymentMethod,
                paymentAmount
              };

              localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
              localStorage.setItem('checkoutItemNotes', JSON.stringify(itemNotes));

              // Redirect to payment success page
              setLocation(`/payment-success?salesOrderId=${salesOrderId}`);
              
              setIsSubmitting(false);
              return;
            }
          }
        } catch (error) {
          console.error('Error fetching profile directly:', error);
        }
      }

      let profileResponse = userProfile;

      // Ak nie je userProfile, skús načítať priamo
      if (profileResponse === undefined || profileResponse === null) {
        try {
          const directResponse = await fetch('/api/profile', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (directResponse.ok) {
            const directData = await directResponse.json();
            if (directData.success && directData.data) {
              profileResponse = directData;
            }
          }
        } catch (error) {
          console.error('Error fetching profile directly:', error);
        }
      }

      // Kontrola, či máme platný profil
      if (!profileResponse || !profileResponse.success || !profileResponse.data) {
        setShowAuthDialog(true);
        toast({
          title: "Prihláste sa",
          description: "Pre dokončenie objednávky je potrebné prihlásenie alebo registrácia.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      const profileData = profileResponse.data || {};

      const customerInfo = {
        firstName: profileData.firstName || profileData.customerName || profileData.name || 'Guest',
        lastName: profileData.lastName || 'Customer',
        email: profileData.email || 'guest@marsela.sk',
        phone: profileData.mobile || '+421000000000'
      };

      const deliveryInfo = {
        date: deliveryDate,
        time: deliveryTime
      };

      // Call checkout/start API to create Sales Order first
      const res = await apiRequest('POST', '/api/checkout/start', {
        cartItems: cartItemsWithNotes,
        customerInfo,
        deliveryInfo,
        paymentMethod,
        paymentAmount // Posli vybranú sumu platby
      });

      const response = await res.json();

      if (!response.success) {
        throw new Error(response.error || 'Failed to start checkout process');
      }

      const { salesOrderId, amounts, paymentOptions } = response;

      console.log('Sales Order created:', salesOrderId, 'amounts:', amounts);

      // Clear cart after successful order creation
      if (onClearCart) {
        onClearCart();
      }

      // Store checkout data for payment page
      const checkoutData = {
        salesOrderId,
        amounts,
        paymentOptions,
        deliveryDate,
        deliveryTime,
        paymentMethod,
        paymentAmount
      };

      localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
      localStorage.setItem('checkoutItemNotes', JSON.stringify(itemNotes));

      // Redirect to payment success page
      setLocation(`/payment-success?salesOrderId=${salesOrderId}`);

    } catch (error: any) {
      console.error('Error starting checkout process:', error);
      let errorMessage = "Nepodarilo sa vytvoriť objednávku. Skúste to znovu.";
      
      if (error && error.message) {
        // Extract the actual error message from the formatted error string
        // Format is usually "400: {"error":"Invalid cart items"}"
        const match = error.message.match(/\d+:\s*(.+)/);
        if (match) {
          try {
            const errorData = JSON.parse(match[1]);
            if (errorData.error) {
              errorMessage = errorData.error;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            // If JSON parsing fails, use the original message
            errorMessage = match[1];
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Chyba pri vytváraní objednávky",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-serif mb-4">Váš košík je prázdny</h1>
            <p className="text-muted-foreground mb-8">
              Pre pokračovanie k objednávke najprv pridajte produkty do košíka.
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
        <h1 className="text-3xl font-serif text-center mb-8">Dokončenie objednávky</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Ľavá strana - Zoznam produktov */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Vaše produkty
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div 
                    key={item.id}
                    className="space-y-3 p-4 border border-card-border rounded-lg"
                    data-testid={`checkout-item-${item.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <img 
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × €{item.price.toFixed(2)}
                        </p>
                        {/* Zobraz atribúty s cenami pre custom cake */}
                        {(item as any).customAttributesWithPrices && Array.isArray((item as any).customAttributesWithPrices) && (item as any).customAttributesWithPrices.length > 0 ? (
                          <div className="mt-2 p-2 bg-muted rounded-md">
                            <p className="text-xs text-muted-foreground mb-1">Konfigurácia produktu:</p>
                            <div className="space-y-1">
                              {(item as any).customAttributesWithPrices.map((attr: { name: string; value: string; price: number }, idx: number) => (
                                <p key={idx} className="text-xs" data-testid={`text-attribute-${item.id}-${idx}`}>
                                  {attr.name}: {attr.value}{attr.price > 0 ? ` ${attr.price} €` : ''}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : item.additional_notes ? (
                          <div className="mt-2 p-2 bg-muted rounded-md">
                            <p className="text-xs text-muted-foreground mb-1">Konfigurácia produktu:</p>
                            <p className="text-xs" data-testid={`text-existing-notes-${item.id}`}>
                              {item.additional_notes}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold" data-testid={`text-item-total-${item.id}`}>
                          €{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`note-${item.id}`} className="text-xs text-muted-foreground">
                        Poznámka k položke (voliteľné)
                      </Label>
                      <Textarea
                        id={`note-${item.id}`}
                        value={itemNotes[item.id] || ''}
                        onChange={(e) => updateItemNote(item.id, e.target.value)}
                        placeholder="Poznámka k tejto položke..."
                        className="min-h-[60px] text-xs mt-1"
                        data-testid={`textarea-item-note-${item.id}`}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Pravá strana - Sidebar */}
          <div className="space-y-6">
            {/* Dátum a čas doručenia */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Dátum doručenia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="delivery-date">Dátum</Label>
                  <Input
                    id="delivery-date"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    data-testid="input-delivery-date"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="delivery-time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Čas
                  </Label>
                  <Input
                    id="delivery-time"
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    data-testid="input-delivery-time"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Zľavový kupón */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-serif">Zľavový kupón</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Zadajte kód kupónu"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    data-testid="input-coupon-code"
                  />
                  <Button variant="outline" data-testid="button-apply-coupon">
                    Použiť
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Súhrn objednávky */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-serif">Súhrn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* VAT breakdown */}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Spolu bez DPH:</span>
                  <span data-testid="text-subtotal-without-vat">{formatPrice(subtotalWithoutVat)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>DPH:</span>
                  <span data-testid="text-total-vat-amount">{formatPrice(totalVat)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medzisúčet s DPH:</span>
                  <span data-testid="text-subtotal-with-vat">{formatPrice(subtotalWithVat)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Zľava:</span>
                    <span data-testid="text-discount">-{formatPrice(discount)}</span>
                  </div>
                )}
                <Separator />
                {depositCalculation.requiresDeposit && (
                  <div className="flex justify-between text-amber-600">
                    <span>Možná záloha (50%):</span>
                    <span data-testid="text-deposit-amount">{formatPrice(depositCalculation.depositAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold">
                  <span>Celkom:</span>
                  <span data-testid="text-total">{formatPrice(total)}</span>
                </div>
                {depositCalculation.requiresDeposit && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Dôvod zálohy:</span>
                    <span data-testid="text-deposit-reason">{getDepositReason(depositCalculation.reason)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suma platby */}
            {depositCalculation.requiresDeposit && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-serif">Suma platby</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup 
                    value={paymentAmount} 
                    onValueChange={(value) => setPaymentAmount(value as 'full' | 'deposit')}
                    data-testid="payment-amount-group"
                  >
                    {paymentOptions.map((option) => (
                      <div key={option.id} className="flex items-start space-x-2">
                        <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                        <Label htmlFor={option.id} className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{option.label}</span>
                            <span className="font-bold text-primary">{formatPrice(option.amount)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Platobné metódy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-serif">Platobná metóda</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Check if current date is before 2026-01-01
                  const currentDate = new Date();
                  const cutoffDate = new Date('2026-01-01');
                  const showStorePayment = currentDate < cutoffDate;

                  if (showStorePayment) {
                    // Show store payment text until 31.12.2025
                    return (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Banknote className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Platba na prevádzke hotovosť alebo karta</p>
                          <p className="text-sm text-muted-foreground">Platba sa uskutoční pri prevzatí objednávky</p>
                        </div>
                      </div>
                    );
                  }

                  // Show normal payment methods from 2026-01-01 onwards
                  const methods = getPaymentMethods();
                  // Ak je len jedna možnosť, zobraz ju ako informačný text
                  if (methods.length === 1) {
                    const method = methods[0];
                    const IconComponent = method.icon === 'qr_code' ? QrCode : 
                                        method.icon === 'credit_card' ? CreditCard : 
                                        Banknote;
                    return (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <IconComponent className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{method.label}</p>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                      </div>
                    );
                  }
                  // Ak je viac možností, zobraz RadioGroup
                  return (
                    <RadioGroup 
                      value={paymentMethod} 
                      onValueChange={setPaymentMethod}
                      data-testid="payment-method-group"
                    >
                      {methods.map((method) => {
                        const IconComponent = method.icon === 'qr_code' ? QrCode : 
                                            method.icon === 'credit_card' ? CreditCard : 
                                            Banknote;
                        
                        return (
                          <div key={method.id} className="flex items-start space-x-2">
                            <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                            <Label htmlFor={method.id} className="cursor-pointer flex-1">
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                <span className="font-medium">{method.label}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{method.description}</p>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Finálne tlačidlo */}
            <Button 
              className="w-full"
              size="lg"
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              data-testid="button-submit-order"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Odosielanie objednávky...
                </>
              ) : (
                paymentAmount === 'deposit' && depositCalculation.requiresDeposit
                  ? `Objednávka s povinnosťou platby (záloha ${formatPrice(finalAmount)})`
                  : `Objednávka s povinnosťou platby ${formatPrice(finalAmount)}`
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prihlásenie je potrebné</DialogTitle>
            <DialogDescription>
              Pre dokončenie objednávky sa prosím prihláste alebo si vytvorte nový účet. Po úspešnom prihlásení sa vrátite späť do košíka.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button className="flex-1" onClick={() => setLocation('/prihlasenie')}>
              Prihlásiť sa
            </Button>
            <Button className="flex-1" variant="outline" onClick={() => setLocation('/registracia')}>
              Registrovať sa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}