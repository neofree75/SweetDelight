import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Cake, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format-price';
import SEO from '@/components/SEO';

// Hook to fetch custom cake product (TORTCUS001) for min order quantity
function useCustomCakeProduct() {
  return useQuery({
    queryKey: ['/api/products', 'TORTCUS001'],
    queryFn: async () => {
      const response = await fetch('/api/products/TORTCUS001');
      if (!response.ok) {
        throw new Error('Failed to fetch custom cake product');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

function useWebsiteItem(websiteItemId: string) {
  return useQuery({
    queryKey: ['/api/website-items', websiteItemId],
    queryFn: async () => {
      const response = await fetch(`/api/website-items/${websiteItemId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch website item');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
    enabled: Boolean(websiteItemId)
  });
}

interface SpecificationOption {
  id: string;
  name: string;
  options: string[];
  optionPrices: Record<string, number>; // Mapuje hodnotu na cenu
}

interface CustomCakeOrderProps {
  onAddToCart: (product: any, quantity: number) => void;
  onCartOpen: () => void;
}

// Pomocná funkcia na parsovanie cien z atribútov
// Napr. "Vanilka {5}" → {name: "Vanilka", price: 5}
function parseAttributeWithPrice(value: string): { name: string; price: number } {
  const match = value.match(/^(.+?)\s*\{(\d+(?:\.\d+)?)\}/);
  if (match) {
    return {
      name: match[1].trim(),
      price: parseFloat(match[2])
    };
  }
  return {
    name: value.trim(),
    price: 0
  };
}

// Pomocná funkcia na zaokrúhlenie cien
function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function CustomCakeOrder({ onAddToCart, onCartOpen }: CustomCakeOrderProps) {
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const { toast } = useToast();

  // Fetch custom cake product for min order quantity
  const { data: customCakeProduct, isLoading: productLoading } = useCustomCakeProduct();

  const { data: websiteItem, isLoading: websiteItemLoading, error: websiteItemError } = useWebsiteItem('WEB-ITM-0004');
  
  const isLoading = productLoading || websiteItemLoading;

  const handleAttributeChange = (attributeId: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeId]: value
    }));
  };

  const configurationOptions: SpecificationOption[] = useMemo(() => {
    if (!websiteItem?.specifications) {
      return [];
    }
    return websiteItem.specifications.map(spec => {
      const rawValues = spec.value
        .split(',')
        .map(value => value.trim())
        .filter(value => value.length > 0);
      const uniqueValues = Array.from(new Set(rawValues));
      
      // Vytvor objekt cien pre každú možnosť
      const optionPrices: Record<string, number> = {};
      
      uniqueValues.forEach(rawValue => {
        const parsed = parseAttributeWithPrice(rawValue);
        optionPrices[rawValue] = parsed.price; // Ulož pôvodnú hodnotu s cenou
      });
      
      return {
        id: spec.key,
        name: spec.label,
        options: uniqueValues, // Ponechaj pôvodné hodnoty pre výber (obsahujú cenu)
        optionPrices
      };
    });
  }, [websiteItem]);

  const priceData = useMemo(() => {
    const vatRate = customCakeProduct?.vatRate ?? 0;
    const priceWithoutVat = customCakeProduct?.price ??
      (customCakeProduct?.priceWithVat !== undefined && vatRate > 0
        ? roundCurrency(customCakeProduct.priceWithVat / (1 + vatRate / 100))
        : undefined);
    const priceWithVat = customCakeProduct?.priceWithVat ??
      (priceWithoutVat !== undefined && vatRate > 0
        ? roundCurrency(priceWithoutVat * (1 + vatRate / 100))
        : undefined);

    const fallbackPriceWithVat = websiteItem?.priceWithVat ?? websiteItem?.price ?? 25;
    const basePriceWithVat = priceWithVat ?? roundCurrency(fallbackPriceWithVat);
    const basePriceWithoutVat = priceWithoutVat ??
      roundCurrency(basePriceWithVat / (1 + (vatRate || 20) / 100));
    
    // Pripočítaj ceny z vybraných atribútov
    let attributesPriceTotal = 0;
    configurationOptions.forEach(option => {
      const selectedValue = selectedAttributes[option.id];
      if (selectedValue) {
        const price = option.optionPrices[selectedValue] || 0;
        attributesPriceTotal += price;
      }
    });
    
    // Pripočítaj ceny atribútov k základnej cene
    const computedPriceWithoutVat = basePriceWithoutVat + attributesPriceTotal;
    const computedPriceWithVat = roundCurrency(computedPriceWithoutVat * (1 + (vatRate || 20) / 100));
    const effectiveVatRate = vatRate || roundCurrency(((computedPriceWithVat / computedPriceWithoutVat) - 1) * 100);
    
    // Vypočítaj hodnoty pre zobrazenie
    const basePriceWithVatDisplay = roundCurrency(basePriceWithoutVat * (1 + effectiveVatRate / 100));
    const attributesPriceWithVatDisplay = roundCurrency(attributesPriceTotal * (1 + effectiveVatRate / 100));

    return {
      priceWithoutVat: computedPriceWithoutVat,
      priceWithVat: computedPriceWithVat,
      vatRate: effectiveVatRate,
      attributesPriceTotal,
      basePriceWithVatDisplay,
      attributesPriceWithVatDisplay
    };
  }, [customCakeProduct, websiteItem, configurationOptions, selectedAttributes]);

  const handleAddToCart = () => {
    // Convert attribute IDs to names for proper display in cart
    // Ulož informácie o atribútoch s cenami
    const customAttributesWithNames: Record<string, string> = {};
    const customAttributesWithPrices: Array<{ name: string; value: string; price: number }> = [];
    
    configurationOptions.forEach(option => {
      const selectedValue = selectedAttributes[option.id];
      if (selectedValue) {
        const parsed = parseAttributeWithPrice(selectedValue);
        customAttributesWithNames[option.name] = parsed.name; // Ulož iba názov bez ceny
        customAttributesWithPrices.push({
          name: option.name,
          value: parsed.name,
          price: parsed.price
        });
      }
    });

    // Vytvor text pre atribúty s cenami (napr. "Vanilka 5 €")
    const attributesText = customAttributesWithPrices
      .map(attr => `${attr.value} ${attr.price > 0 ? `${attr.price} €` : ''}`)
      .filter(attr => attr.trim())
      .join(', ');

    const baseDescription = websiteItem?.description?.trim();
    const descriptionParts = [
      baseDescription,
      attributesText ? `Vybrané možnosti: ${attributesText}` : undefined,
      specialInstructions ? `Poznámky: ${specialInstructions}` : undefined
    ].filter(Boolean);

    // Create a custom cake product object
    const customCakeProductObject = {
      id: `custom-cake-${Date.now()}`,
      name: 'Torta na mieru',
      description: descriptionParts.join(' | '),
      price: priceData.priceWithoutVat,
      priceWithVat: priceData.priceWithVat,
      vatRate: priceData.vatRate,
      image: websiteItem?.image ?? customCakeProduct?.image ?? '/placeholder-product.jpg',
      category: 'Torty na mieru',
      inStock: true,
      minOrderQuantity: customCakeProduct?.minOrderQuantity || 1, // Použij minimálne množstvo z ERPNext
      customAttributes: customAttributesWithNames, // Use names instead of IDs
      customAttributesWithPrices, // Ulož atribúty s cenami pre zobrazenie
      specialInstructions
    };

    onAddToCart(customCakeProductObject, customCakeProduct?.minOrderQuantity || 1);
    onCartOpen();
    
    toast({
      title: "Torta na mieru pridaná do košíka",
      description: "Vaša vlastná torta bola úspešne pridaná do košíka.",
    });

    // Reset form
    setSelectedAttributes({});
    setSpecialInstructions('');
  };

  const isFormValid = configurationOptions.length === 0 ||
    configurationOptions.every(option => Boolean(selectedAttributes[option.id]));

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Načítavam možnosti pre torty na mieru...</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedOptionCount = configurationOptions.filter(option => Boolean(selectedAttributes[option.id])).length;

  if (websiteItemError) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">Chyba pri načítaní možností pre torty na mieru.</p>
              <Button onClick={() => window.location.reload()}>
                Skúsiť znova
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Torta na mieru | Marsela Bakery"
        description="Vytvorte si vašu vlastnú tortu presne podľa vašich predstáv. Vyberte si zo širokej ponuky ingrediencií a príchutí. Plnka, poleva, veľkosť - všetko podľa vašich požiadaviek."
        keywords="torta na mieru, vlastná torta, ingrediencie, príchute, plnka, poleva, veľkosť, objednávka torty, Marsela Bakery"
        canonical="/torta-na-mieru"
      />
      <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Cake className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">Torta na mieru</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Vytvorte si vašu vlastnú tortu presne podľa vašich predstáv. 
            Vyberte si zo širokej ponuky ingrediencií a príchutí.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Configuration Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary" />
                  Konfigurácia torty
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {configurationOptions.map((option) => (
                  <div key={option.id} className="space-y-3">
                    <Label className="text-base font-medium">{option.name}</Label>
                    <Select
                      value={selectedAttributes[option.id] || ''}
                      onValueChange={(value) => handleAttributeChange(option.id, value)}
                    >
                      <SelectTrigger data-testid={`select-attribute-${option.id}`}>
                        <SelectValue placeholder={`Vyberte ${option.name.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {option.options.map((value) => {
                          const parsed = parseAttributeWithPrice(value);
                          return (
                          <SelectItem 
                            key={value} 
                            value={value}
                            data-testid={`option-${option.id}-${value}`}
                          >
                              {parsed.name}
                          </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                {/* Special Instructions */}
                <div className="space-y-3">
                  <Label htmlFor="special-instructions" className="text-base font-medium">
                    Osobitné pokyny (voliteľné)
                  </Label>
                  <Textarea
                    id="special-instructions"
                    placeholder="Opíšte akékoľvek špeciálne požiadavky pre vašu tortu..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={4}
                    data-testid="textarea-special-instructions"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Súhrn objednávky</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {websiteItem && (
                  <div className="space-y-3">
                    {websiteItem.image && (
                      <img
                        src={websiteItem.image}
                        alt={websiteItem.title}
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    )}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{websiteItem.title}</h3>
                      {websiteItem.description && (
                        <p className="text-sm text-muted-foreground">
                          {websiteItem.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <h4 className="font-medium text-sm mb-2">Vybraté možnosti:</h4>
                  {selectedOptionCount > 0 ? (
                    <dl className="space-y-2 text-sm">
                      {configurationOptions.map(option => {
                        const chosen = selectedAttributes[option.id];
                        if (!chosen) {
                          return null;
                        }
                        const parsed = parseAttributeWithPrice(chosen);
                        const price = option.optionPrices[chosen] || 0;
                        return (
                          <div key={option.id} className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">{option.name}:</dt>
                            <dd className="font-medium text-right">
                              {parsed.name}{price > 0 ? ` ${price} €` : ''}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Zatiaľ ste nevybrali žiadne možnosti
                    </p>
                  )}
                </div>

                {specialInstructions && (
                  <div className="space-y-2 pt-3 border-t">
                    <h4 className="font-medium text-sm">Osobitné pokyny:</h4>
                    <p className="text-sm text-muted-foreground" data-testid="summary-instructions">
                      {specialInstructions}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  {priceData.attributesPriceTotal > 0 && (
                    <div className="mb-2 space-y-1">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Základná cena:</span>
                        <span>{formatPrice(priceData.basePriceWithVatDisplay)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Doplnky:</span>
                        <span>+{formatPrice(priceData.attributesPriceWithVatDisplay)}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-medium">Orientačná cena:</span>
                    <span className="text-2xl font-bold text-primary" data-testid="estimated-price">
                      {formatPrice(priceData.priceWithVat)}
                    </span>
                  </div>
                  
                  {customCakeProduct?.minOrderQuantity && customCakeProduct.minOrderQuantity > 1 && (
                    <div className="mb-4 text-sm text-muted-foreground">
                      Min. objednávka: {customCakeProduct.minOrderQuantity} kusov
                    </div>
                  )}
                  
                  <Button
                    onClick={handleAddToCart}
                    disabled={!isFormValid}
                    className="w-full"
                    size="lg"
                    data-testid="button-add-to-cart"
                  >
                    Pridať do košíka
                  </Button>
                  
                  {!isFormValid && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Vyberte všetky povinné možnosti
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
      </div>
    </>
  );
}