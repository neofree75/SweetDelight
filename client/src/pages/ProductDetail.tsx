import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Minus, Loader2, ShoppingCart } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

interface ProductDetailProps {
  onAddToCart?: (product: Product, quantity: number) => void;
  onCartOpen?: () => void;
}

export default function ProductDetail({ onAddToCart, onCartOpen }: ProductDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  // Minimálny počet pre zákusky je 10 ks, inak 1
  const getMinQuantity = (category: string) => category === 'Zákusky' ? 10 : 1;
  
  const [quantity, setQuantity] = useState(1);

  // Fetch product detail from API
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['/api/products', id],
    queryFn: async (): Promise<Product> => {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        throw new Error('Produkt nebol nájdený');
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Set minimum quantity when product loads
  useEffect(() => {
    if (product) {
      setQuantity(getMinQuantity(product.category));
    }
  }, [product]);

  const handleGoBack = () => {
    setLocation('/obchod');
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    onAddToCart?.(product, quantity);
    console.log(`Added ${quantity}x ${product.name} to cart`);
    // Automatically open cart after adding item
    onCartOpen?.();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-8">
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-center items-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Načítavam detail produktu...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background pt-8">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={handleGoBack}
              className="mb-4"
              data-testid="button-back-to-shop"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Späť na obchod
            </Button>
          </div>
          
          <div className="text-center py-12">
            <p className="text-destructive text-lg mb-4">
              {error instanceof Error ? error.message : 'Produkt nebol nájdený'}
            </p>
            <Button onClick={handleGoBack} data-testid="button-back-to-shop-error">
              Späť na obchod
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-8">
      <div className="container mx-auto px-4 py-12">
        {/* Back Navigation */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={handleGoBack}
            className="mb-4"
            data-testid="button-back-to-shop"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Späť na obchod
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden rounded-lg">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    data-testid={`img-product-detail-${product.id}`}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <h1 
                  className="text-3xl md:text-4xl font-serif font-bold text-foreground"
                  data-testid={`text-product-detail-name-${product.id}`}
                >
                  {product.name}
                </h1>
                <Badge variant="secondary" className="text-sm">
                  {product.category}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <span 
                  className="text-3xl font-semibold text-primary"
                  data-testid={`text-product-detail-price-${product.id}`}
                >
                  €{product.price.toFixed(2)}
                </span>
                
                {!product.inStock && (
                  <Badge variant="destructive">
                    Vypredané
                  </Badge>
                )}
              </div>

              <p 
                className="text-muted-foreground text-lg leading-relaxed"
                data-testid={`text-product-detail-description-${product.id}`}
              >
                {product.description}
              </p>
            </div>

            {/* Add to Cart Section */}
            {product.inStock ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-serif">Objednať</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Minimum quantity notice for Zákusky */}
                  {product.category === 'Zákusky' && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Upozornenie:</strong> Minimálny počet objednávky pre zákusky je {getMinQuantity(product.category)} kusov.
                      </p>
                    </div>
                  )}
                  
                  {/* Quantity Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Počet kusov:
                    </label>
                    <div className="flex items-center justify-center space-x-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(getMinQuantity(product.category), quantity - 1))}
                        className="h-10 w-10"
                        disabled={quantity <= getMinQuantity(product.category)}
                        data-testid={`button-decrease-detail-${product.id}`}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span 
                        className="font-medium text-xl w-12 text-center"
                        data-testid={`text-quantity-detail-${product.id}`}
                      >
                        {quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(quantity + 1)}
                        className="h-10 w-10"
                        data-testid={`button-increase-detail-${product.id}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Total Price */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-foreground">Celková cena:</span>
                      <span 
                        className="text-2xl font-bold text-primary"
                        data-testid={`text-total-price-detail-${product.id}`}
                      >
                        €{(product.price * quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Add to Cart Button */}
                  <Button 
                    className="w-full h-12 text-lg"
                    onClick={handleAddToCart}
                    data-testid={`button-add-to-cart-detail-${product.id}`}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Pridať do košíka
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-lg text-muted-foreground mb-4">
                    Tento produkt nie je momentálne skladom.
                  </p>
                  <Button disabled className="w-full" data-testid={`button-out-of-stock-detail-${product.id}`}>
                    Nie je skladom
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}