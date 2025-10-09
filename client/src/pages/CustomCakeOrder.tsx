import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Cake, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CustomCakeAttribute, CustomCakeAttributeValue } from '@shared/schema';
import { formatPrice } from '@/lib/format-price';

// Hook to fetch custom cake attributes from ERPNext
function useCustomCakeAttributes() {
  return useQuery({
    queryKey: ['/api/custom-cake-attributes'],
    queryFn: async (): Promise<CustomCakeAttribute[]> => {
      const response = await fetch('/api/custom-cake-attributes');
      if (!response.ok) {
        throw new Error('Failed to fetch custom cake attributes');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

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

interface CustomCakeOrderProps {
  onAddToCart: (product: any, quantity: number) => void;
  onCartOpen: () => void;
}

export default function CustomCakeOrder({ onAddToCart, onCartOpen }: CustomCakeOrderProps) {
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [estimatedPrice] = useState(25.00); // Base price for custom cake
  const { toast } = useToast();

  // Fetch custom cake attributes from ERPNext
  const { data: attributes = [], isLoading: attributesLoading, error } = useCustomCakeAttributes();
  
  // Fetch custom cake product for min order quantity
  const { data: customCakeProduct, isLoading: productLoading } = useCustomCakeProduct();
  
  const isLoading = attributesLoading || productLoading;

  const handleAttributeChange = (attributeId: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeId]: value
    }));
  };

  const handleAddToCart = () => {
    // Convert attribute IDs to names for proper display in cart
    const customAttributesWithNames: Record<string, string> = {};
    Object.entries(selectedAttributes).forEach(([attrId, value]) => {
      const attr = attributes.find(a => a.id === attrId);
      if (attr) {
        customAttributesWithNames[attr.name] = value;
      }
    });

    // Create a custom cake product object
    const customCakeProductObject = {
      id: `custom-cake-${Date.now()}`,
      name: 'Torta na mieru',
      description: `Vlastná torta s atribútmi: ${Object.entries(customAttributesWithNames)
        .map(([name, value]) => `${name}: ${value}`)
        .join(', ')}${specialInstructions ? `, Poznámky: ${specialInstructions}` : ''}`,
      price: estimatedPrice,
      image: '/api/placeholder/300/200', // Default custom cake image
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

  const isFormValid = attributes.length > 0 && 
    attributes.every(attr => selectedAttributes[attr.id] || attr.isNumeric);

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

  if (error) {
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
                {attributes.map((attribute) => (
                  <div key={attribute.id} className="space-y-3">
                    <Label className="text-base font-medium">{attribute.name}</Label>
                    
                    {attribute.isNumeric ? (
                      // Numeric attribute (range input)
                      <div className="space-y-2">
                        <Input
                          type="number"
                          min={attribute.fromRange || 0}
                          max={attribute.toRange || 100}
                          step={attribute.increment || 1}
                          value={selectedAttributes[attribute.id] || ''}
                          onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
                          placeholder={`Od ${attribute.fromRange || 0} do ${attribute.toRange || 100}`}
                          data-testid={`input-attribute-${attribute.id}`}
                        />
                        {attribute.fromRange !== undefined && attribute.toRange !== undefined && (
                          <p className="text-sm text-muted-foreground">
                            Rozsah: {attribute.fromRange} - {attribute.toRange}
                            {attribute.increment && ` (krok: ${attribute.increment})`}
                          </p>
                        )}
                      </div>
                    ) : (
                      // Text attribute (select dropdown)
                      <Select
                        value={selectedAttributes[attribute.id] || ''}
                        onValueChange={(value) => handleAttributeChange(attribute.id, value)}
                      >
                        <SelectTrigger data-testid={`select-attribute-${attribute.id}`}>
                          <SelectValue placeholder={`Vyberte ${attribute.name.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {attribute.values?.map((value, index) => (
                            <SelectItem 
                              key={index} 
                              value={value.attribute_value}
                              data-testid={`option-${attribute.id}-${value.attribute_value}`}
                            >
                              {value.attribute_value}
                              {value.abbreviation && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {value.abbreviation}
                                </Badge>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
                <div className="space-y-3">
                  <h4 className="font-medium">Vybraté možnosti:</h4>
                  {Object.entries(selectedAttributes).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(selectedAttributes).map(([attrId, value]) => {
                        const attr = attributes.find(a => a.id === attrId);
                        return attr ? (
                          <div key={attrId} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{attr.name}:</span>
                            <span className="font-medium" data-testid={`summary-${attrId}`}>
                              {value}
                            </span>
                          </div>
                        ) : null;
                      })}
                    </div>
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
                    <span className="text-lg font-medium">Odhadovaná cena:</span>
                    <span className="text-2xl font-bold text-primary" data-testid="estimated-price">
{formatPrice(estimatedPrice)}
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
  );
}