import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, Clock, CreditCard, Banknote, ShoppingBag } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  additional_notes?: string;
}

interface CheckoutProps {
  cartItems: CartItem[];
}

export default function Checkout({ cartItems }: CheckoutProps) {
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [, setLocation] = useLocation();

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = 0; // Implementované neskôr s kupónmi
  const total = subtotal - discount;

  // Funkcia pre aktualizáciu poznámok k položkám
  const updateItemNote = (itemId: string, note: string) => {
    setItemNotes(prev => ({
      ...prev,
      [itemId]: note
    }));
  };

  const handleSubmitOrder = () => {
    // Validácia povinných polí
    if (!deliveryDate || !deliveryTime) {
      alert('Prosím vyplňte dátum a čas doručenia');
      return;
    }

    // Pridať poznámky k položkám - zachovať existujúce additional_notes a pridať nové ak sú zadané
    const cartItemsWithNotes = cartItems.map(item => {
      const existingNotes = item.additional_notes || '';
      const newNotes = itemNotes[item.id] || '';
      const combinedNotes = existingNotes && newNotes 
        ? `${existingNotes}, ${newNotes}` 
        : existingNotes || newNotes;
        
      return {
        ...item,
        additional_notes: combinedNotes
      };
    });

    console.log('Proceeding to billing page with:', {
      items: cartItemsWithNotes,
      deliveryDate,
      deliveryTime,
      paymentMethod,
      total
    });

    // Navigácia na pokladňa stránku - údaje sa predajú cez URL params pre jednoduchosť
    // Poznámky k položkám sa uložia do localStorage pre prenesenie medzi stránkami
    localStorage.setItem('checkoutItemNotes', JSON.stringify(itemNotes));
    
    const params = new URLSearchParams({
      date: deliveryDate,
      time: deliveryTime,
      payment: paymentMethod
    });
    
    setLocation(`/pokladna?${params.toString()}`);
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
                        {item.additional_notes && (
                          <div className="mt-2 p-2 bg-muted rounded-md">
                            <p className="text-xs text-muted-foreground mb-1">Konfigurácia produktu:</p>
                            <p className="text-xs" data-testid={`text-existing-notes-${item.id}`}>
                              {item.additional_notes}
                            </p>
                          </div>
                        )}
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
                <div className="flex justify-between">
                  <span>Medzisúčet:</span>
                  <span data-testid="text-subtotal">€{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Zľava:</span>
                    <span data-testid="text-discount">-€{discount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Celkom:</span>
                  <span data-testid="text-total">€{total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Platobné metódy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-serif">Platobná metóda</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={paymentMethod} 
                  onValueChange={setPaymentMethod}
                  data-testid="payment-method-group"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      Platobná karta
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                      <Banknote className="h-4 w-4" />
                      Hotovosť pri prevzatí
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Finálne tlačidlo */}
            <Button 
              className="w-full"
              size="lg"
              onClick={handleSubmitOrder}
              data-testid="button-submit-order"
            >
              Skontrolovať a objednať
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}