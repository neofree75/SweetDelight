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
}

interface CustomCakeOrderProps {
  onAddToCart: (product: any, quantity: number) => void;
  onCartOpen: () => void;
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

  const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

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
    const computedPriceWithVat = priceWithVat ?? roundCurrency(fallbackPriceWithVat);
    const computedPriceWithoutVat = priceWithoutVat ??
      roundCurrency(computedPriceWithVat / (1 + (vatRate || 20) / 100));
    const effectiveVatRate = vatRate || roundCurrency(((computedPriceWithVat / computedPriceWithoutVat) - 1) * 100);

    return {
      priceWithoutVat: computedPriceWithoutVat,
      priceWithVat: computedPriceWithVat,
      vatRate: effectiveVatRate
    };
  }, [customCakeProduct, websiteItem]);

  const handleAddToCart = () => {
    // Convert attribute IDs to names for proper display in cart
    const customAttributesWithNames: Record<string, string> = {};
    configurationOptions.forEach(option => {
      const selectedValue = selectedAttributes[option.id];
      if (selectedValue) {
        customAttributesWithNames[option.name] = selectedValue;
      }
    });

    const attributesText = Object.entries(customAttributesWithNames)
      .map(([name, value]) => `${name}: ${value}`)
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
      return {
        id: spec.key,
        name: spec.label,
        options: uniqueValues
      };
    });
  }, [websiteItem]);

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
                        {option.options.map((value) => (
                          <SelectItem 
                            key={value} 
                            value={value}
                            data-testid={`option-${option.id}-${value}`}
                          >
                            {value}
                          </SelectItem>
                        ))}
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
                      {websiteItem?.specifications?.map(spec => {
                        const chosen = selectedAttributes[spec.key];
                        if (!chosen) {
                          return null;
                        }
                        return (
                          <div key={spec.key} className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">{spec.label}:</dt>
                            <dd className="font-medium text-right">{chosen}</dd>
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