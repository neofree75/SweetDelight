import { useState, useEffect } from 'react';
import { useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, CreditCard, Banknote, Loader2 } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface User {
  email: string;
  name: string;
}

interface BillingProps {
  cartItems: CartItem[];
  user?: User | null;
}

export default function Billing({ cartItems, user }: BillingProps) {
  const search = useSearch();
  const params = new URLSearchParams(search);
  
  // Získaj údaje z URL parametrov
  const deliveryDate = params.get('date') || '';
  const deliveryTime = params.get('time') || '';
  const paymentMethod = params.get('payment') || 'card';
  
  // Fakturačné údaje
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  // Firemné fakturovanie
  const [isBusiness, setIsBusiness] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [ico, setIco] = useState('');
  const [dic, setDic] = useState('');
  const [icDph, setIcDph] = useState('');

  // Loading state pre načítavanie profilu
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Poznámky k jednotlivým položkám
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});

  // Načítanie profilu prihlásených používateľov
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      setIsLoadingProfile(true);
      
      try {
        const response = await fetch(`/api/profile?email=${encodeURIComponent(user.email)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          const profileData = result.data;
          
          // Naplniť formulár údajmi z profilu
          if (profileData.email) setEmail(profileData.email);
          if (profileData.mobile) setMobile(profileData.mobile);
          if (profileData.firstName) setFirstName(profileData.firstName);
          if (profileData.lastName) setLastName(profileData.lastName);
          
          // Adresa (ak existuje)
          if (profileData.addressLine1) {
            // Ak addressLine1 obsahuje ulicu aj číslo, pokúsiť sa ich rozdeliť
            const addressParts = profileData.addressLine1.split(' ');
            const possibleNumber = addressParts[addressParts.length - 1];
            
            // Ak posledná časť obsahuje čísla, predpokladáme že je to číslo domu
            if (/\d/.test(possibleNumber)) {
              setStreet(addressParts.slice(0, -1).join(' '));
              setStreetNumber(possibleNumber);
            } else {
              setStreet(profileData.addressLine1);
            }
          }
          
          if (profileData.city) setCity(profileData.city);
          if (profileData.pincode) setZipCode(profileData.pincode);
          
          // Firemné údaje
          if (profileData.taxId) setDic(profileData.taxId);
          if (profileData.company) setCompanyName(profileData.company);
          
        } else {
          console.log('Profil sa nepodarilo načítať, používateľ bude musieť vyplniť údaje manuálne');
        }
      } catch (error) {
        console.error('Chyba pri načítavaní profilu:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, [user]);

  // Funkcia pre aktualizáciu poznámok k položkám
  const updateItemNote = (itemId: string, note: string) => {
    setItemNotes(prev => ({
      ...prev,
      [itemId]: note
    }));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const delivery: number = 0; // Osobný odber je zadarmo
  const total = subtotal + delivery;

  const handleFinalOrder = () => {
    // Pridať poznámky k položkám
    const cartItemsWithNotes = cartItems.map(item => ({
      ...item,
      additional_notes: itemNotes[item.id] || ''
    }));

    const orderData = {
      billingInfo: {
        email,
        mobile,
        firstName,
        lastName,
        street,
        streetNumber,
        zipCode,
        city,
        notes,
        isBusiness,
        ...(isBusiness && { companyName, ico, dic, icDph })
      },
      cartItems: cartItemsWithNotes,
      deliveryDate,
      deliveryTime,
      paymentMethod,
      total
    };
    
    console.log('Final order data:', orderData);
    // TODO: Implementovať ERPNext integráciu pre vytvorenie objednávky
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-serif mb-4">Žiadne produkty v košíku</h1>
            <p className="text-muted-foreground mb-8">
              Pre dokončenie objednávky vráťte sa späť do obchodu.
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
        <h1 className="text-3xl font-serif text-center mb-8">Pokladňa</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Ľavá strana - Fakturačný formulár */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif flex items-center gap-2">
                  Fakturačná adresa
                  {isLoadingProfile && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </CardTitle>
                {user && (
                  <p className="text-sm text-muted-foreground">
                    Údaje sa automaticky načítali z vášho profilu. Môžete ich upraviť podľa potreby.
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Základné kontaktné údaje */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vas@email.com"
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile">Mobil</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+421 xxx xxx xxx"
                      required
                      data-testid="input-mobile"
                    />
                  </div>
                </div>

                {/* Meno a priezvisko */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Meno</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Vaše meno"
                      required
                      data-testid="input-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Priezvisko</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Vaše priezvisko"
                      required
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                {/* Adresa */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="street">Ulica</Label>
                    <Input
                      id="street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Názov ulice"
                      required
                      data-testid="input-street"
                    />
                  </div>
                  <div>
                    <Label htmlFor="streetNumber">Číslo ulice</Label>
                    <Input
                      id="streetNumber"
                      value={streetNumber}
                      onChange={(e) => setStreetNumber(e.target.value)}
                      placeholder="123"
                      required
                      data-testid="input-street-number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zipCode">PSČ</Label>
                    <Input
                      id="zipCode"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="12345"
                      required
                      data-testid="input-zip-code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Mesto</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Vaše mesto"
                      required
                      data-testid="input-city"
                    />
                  </div>
                </div>

                <Separator />

                {/* Firemné fakturovanie */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="business"
                    checked={isBusiness}
                    onCheckedChange={(checked) => setIsBusiness(checked === true)}
                    data-testid="checkbox-business"
                  />
                  <Label 
                    htmlFor="business" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Fakturovať na firmu (voliteľné)
                  </Label>
                </div>

                {/* Firemné údaje - zobrazované len ak je zaškrtnuté */}
                {isBusiness && (
                  <div className="space-y-4 pl-6 border-l-2 border-muted">
                    <div>
                      <Label htmlFor="companyName">Názov spoločnosti (voliteľné)</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Názov vašej spoločnosti"
                        data-testid="input-company-name"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="ico">IČO (voliteľné)</Label>
                        <Input
                          id="ico"
                          value={ico}
                          onChange={(e) => setIco(e.target.value)}
                          placeholder="12345678"
                          data-testid="input-ico"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dic">DIČ (voliteľné)</Label>
                        <Input
                          id="dic"
                          value={dic}
                          onChange={(e) => setDic(e.target.value)}
                          placeholder="1234567890"
                          data-testid="input-dic"
                        />
                      </div>
                      <div>
                        <Label htmlFor="icDph">IČ DPH (voliteľné)</Label>
                        <Input
                          id="icDph"
                          value={icDph}
                          onChange={(e) => setIcDph(e.target.value)}
                          placeholder="SK1234567890"
                          data-testid="input-ic-dph"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Poznámky */}
                <div>
                  <Label htmlFor="notes">Poznámky</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Vaše poznámky k objednávke..."
                    className="min-h-[100px]"
                    data-testid="textarea-notes"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pravá strana - Súhrn objednávky */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-serif">Vaša objednávka</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Produkty */}
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                        </div>
                        <span className="font-medium" data-testid={`text-order-item-total-${item.id}`}>
                          €{(item.price * item.quantity).toFixed(2)}
                        </span>
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
                          className="min-h-[60px] text-xs"
                          data-testid={`textarea-item-note-${item.id}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Medzisúčet */}
                <div className="flex justify-between">
                  <span>Medzisúčet:</span>
                  <span data-testid="text-order-subtotal">€{subtotal.toFixed(2)}</span>
                </div>

                {/* Doprava */}
                <div className="flex justify-between">
                  <span>Doprava:</span>
                  <span data-testid="text-delivery-cost">
                    {delivery === 0 ? 'Osobný odber - zadarmo' : `€${delivery.toFixed(2)}`}
                  </span>
                </div>

                <Separator />

                {/* Celková cena */}
                <div className="flex justify-between text-lg font-semibold">
                  <span>Cena spolu:</span>
                  <span data-testid="text-order-total">€{total.toFixed(2)}</span>
                </div>

                <Separator />

                {/* Vybratá platba */}
                <div className="flex items-center gap-2">
                  <span>Vybratá platba:</span>
                  <div className="flex items-center gap-1" data-testid="selected-payment-method">
                    {paymentMethod === 'card' ? (
                      <>
                        <CreditCard className="h-4 w-4" />
                        <span>Kartou</span>
                      </>
                    ) : (
                      <>
                        <Banknote className="h-4 w-4" />
                        <span>Hotovosť</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Finálne tlačidlo */}
            <Button 
              className="w-full"
              size="lg"
              onClick={handleFinalOrder}
              data-testid="button-final-order"
            >
              Objednať s povinnosťou platby
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}