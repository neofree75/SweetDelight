import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Minus, Loader2, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '@shared/schema';
import { formatPrice } from '@/lib/format-price';

interface ProductDetailProps {
  onAddToCart?: (product: Product, quantity: number) => void;
  onCartOpen?: () => void;
}

export default function ProductDetail({ onAddToCart, onCartOpen }: ProductDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  const [quantity, setQuantity] = useState(1);
  const [inputValue, setInputValue] = useState('1');
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const stripDiacritics = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const prioritizedSpecificationKeys = ['hmotnost', 'hmotnosť', 'hmotnost-balenia', 'hmotnosť-balenia', 'alergeny', 'alergény'];
  const normalizedPrioritizedSpecKeys = prioritizedSpecificationKeys.map(key => stripDiacritics(key.toLowerCase()));

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
      const minQty = product.minOrderQuantity || 1;
      setQuantity(minQty);
      setInputValue(minQty.toString());
    }
  }, [product]);

  // Keyboard navigation for image gallery
  useEffect(() => {
    if (selectedImageIndex === null) return;
    
    const allImages = product ? [product.image, ...(product.galleryImages || [])] : [];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (selectedImageIndex > 0) {
          setSelectedImageIndex(selectedImageIndex - 1);
        } else {
          setSelectedImageIndex(allImages.length - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (selectedImageIndex < allImages.length - 1) {
          setSelectedImageIndex(selectedImageIndex + 1);
        } else {
          setSelectedImageIndex(0);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedImageIndex(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, product]);

  const handleGoBack = () => {
    setLocation('/obchod');
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    setInputValue(inputVal);
    // No validation during typing - errors only shown on blur/Enter
  };

  const handleQuantityInputBlur = () => {
    const value = parseInt(inputValue) || 0;
    const minQty = product?.minOrderQuantity || 1;
    
    if (value < minQty) {
      setQuantity(minQty);
      setInputValue(minQty.toString());
      if (inputValue && parseInt(inputValue) > 0) {
        setQuantityError(`Minimálne množstvo musí byť ${minQty} ks`);
      } else {
        setQuantityError('');
      }
    } else {
      setQuantity(value);
      setQuantityError('');
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent non-numeric characters except backspace, delete, tab, escape, enter
    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    // Handle Enter key to trigger blur
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    // Parse and commit the current input value before adding to cart
    const currentValue = parseInt(inputValue) || 0;
    const minQty = product.minOrderQuantity || 1;
    const finalQuantity = currentValue < minQty ? minQty : currentValue;
    
    // Update state to committed value and clear errors
    setQuantity(finalQuantity);
    setInputValue(finalQuantity.toString());
    setQuantityError('');
    
    // Ak má produkt varianty a sú dostupné, ale nebol vybraný žiadny variant
    if (product.hasVariants && product.variants && product.variants.length > 0 && !selectedVariant) {
      alert('Prosím vyberte variant produktu pred pridaním do košíka.');
      return;
    }
    
    let productToAdd = product;
    
    // Ak bol vybraný variant, použij jeho cenu ak je dostupná
    if (selectedVariant && product.variants) {
      const variant = product.variants.find(v => v.id === selectedVariant);
      if (variant && variant.price !== undefined) {
        productToAdd = {
          ...product,
          id: variant.id,
          name: `${product.name} - ${variant.name}`,
          price: variant.price, // Cena bez DPH
          // VAT information from variant or fallback to product defaults
          vatRate: variant.vatRate || product.vatRate,
          priceWithVat: variant.priceWithVat || (variant.price * (1 + (variant.vatRate || product.vatRate) / 100))
        };
      }
    }
    
    // Use the committed quantity for add to cart
    onAddToCart?.(productToAdd, finalQuantity);
    console.log(`Added ${finalQuantity}x ${productToAdd.name} to cart`);
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

  const specificationsForDisplay = (() => {
    if (!product.specifications) {
      return [] as Array<{ key: string; label: string; value: string }>;
    }

    const entriesWithIndex = product.specifications.map((spec, index) => ({
      ...spec,
      originalIndex: index,
    }));

    const filtered = entriesWithIndex.filter(spec => {
      const normalizedKey = stripDiacritics(spec.key.toLowerCase());
      if (
        normalizedKey.startsWith('min-pocet') ||
        normalizedKey.startsWith('min pocet') ||
        normalizedKey.startsWith('min_pocet')
      ) {
        return false;
      }
      return Boolean(spec.value?.trim());
    });

    const getPriority = (specKey: string, fallback: number) => {
      const normalizedKey = stripDiacritics(specKey.toLowerCase());
      const index = normalizedPrioritizedSpecKeys.indexOf(normalizedKey);
      return index === -1 ? normalizedPrioritizedSpecKeys.length + fallback : index;
    };

    const sorted = [...filtered].sort((a, b) => {
      const priorityA = getPriority(a.key, a.originalIndex);
      const priorityB = getPriority(b.key, b.originalIndex);
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a.originalIndex - b.originalIndex;
    });

    return sorted.map(({ key, label, value }) => ({ key, label, value }));
  })();

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
                <div 
                  className="aspect-square overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedImageIndex(0)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    data-testid={`img-product-detail-${product.id}`}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Gallery Thumbnails */}
            {product.galleryImages && product.galleryImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {product.galleryImages.map((imageUrl, index) => (
                  <div
                    key={index}
                    className="aspect-square overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity border-2 border-transparent hover:border-primary"
                    onClick={() => setSelectedImageIndex(index + 1)}
                  >
                    <img
                      src={imageUrl}
                      alt={`${product.name} - obrázok ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
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

              <div className="space-y-2 mb-6">
                {/* Price with VAT (main price) */}
                <div className="flex items-center gap-4">
                  <span 
                    className="text-3xl font-semibold text-primary"
                    data-testid={`text-product-detail-price-with-vat-${product.id}`}
                  >
                    {formatPrice(product.priceWithVat)}
                  </span>
                  
                  {!product.inStock && (
                    <Badge variant="destructive">
                      Vypredané
                    </Badge>
                  )}
                </div>
                
                {/* Price without VAT and VAT rate */}
                <div className="flex items-center gap-4 text-lg text-muted-foreground">
                  <span data-testid={`text-product-detail-price-without-vat-${product.id}`}>
                    bez DPH: {formatPrice(product.price)}
                  </span>
                  <span data-testid={`text-product-detail-vat-rate-${product.id}`}>
                    DPH {product.vatRate}%
                  </span>
                </div>
              </div>

              <p 
                className="text-muted-foreground text-lg leading-relaxed"
                data-testid={`text-product-detail-description-${product.id}`}
              >
                {product.description}
              </p>
              {specificationsForDisplay.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-serif">Parametre produktu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid gap-y-4 gap-x-6 sm:grid-cols-2">
                      {specificationsForDisplay.map((spec) => {
                        const normalizedKey = stripDiacritics(spec.key.toLowerCase());
                        const isAllergen = normalizedKey.includes('alergen');
                        const valueClasses = isAllergen
                          ? 'text-base font-semibold text-destructive'
                          : 'text-base text-foreground';
                        return (
                          <div key={spec.key} className="space-y-1">
                            <dt className="text-sm font-medium text-muted-foreground">{spec.label}</dt>
                            <dd className={valueClasses}>{spec.value}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Product Variants */}
            {product.hasVariants && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-serif">Dostupné varianty</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {product.variants && product.variants.length > 0 ? (
                    <div className="grid gap-3">
                      {product.variants.map((variant) => (
                        <div
                          key={variant.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-colors hover-elevate ${
                            selectedVariant === variant.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border'
                          }`}
                          onClick={() => setSelectedVariant(variant.id)}
                          data-testid={`variant-option-${variant.id}`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="radio"
                              id={`variant-${variant.id}`}
                              name="variant"
                              value={variant.id}
                              checked={selectedVariant === variant.id}
                              onChange={(e) => setSelectedVariant(e.target.value)}
                              className="text-primary"
                              data-testid={`radio-variant-${variant.id}`}
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground">{variant.name}</h4>
                              {variant.attributes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {variant.attributes.map((attr, index) => (
                                    <Badge 
                                      key={index} 
                                      variant="secondary" 
                                      className="text-xs"
                                      data-testid={`attribute-${attr.attribute}-${variant.id}`}
                                    >
                                      {attr.attribute}: {attr.value}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {variant.price !== undefined && variant.price !== product.price && (
                                <div className="text-sm mt-2 space-y-1">
                                  <p className="text-primary font-medium">
                                    {formatPrice(variant.priceWithVat || variant.price * 1.2)}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    bez DPH: {formatPrice(variant.price)} | DPH {variant.vatRate || 20}%
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">
                        Varianty tohto produktu sú momentálne v príprave.
                      </p>
                      <p className="text-sm mt-1">
                        Pre viac informácií nás kontaktujte.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Add to Cart Section */}
            {product.inStock ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-serif">Objednať</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Minimum quantity notice */}
                  {(product.minOrderQuantity || 1) > 1 && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Upozornenie:</strong> Minimálny počet objednávky je {product.minOrderQuantity || 1} kusov.
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
                        onClick={() => {
                          const newQty = Math.max(product.minOrderQuantity || 1, quantity - 1);
                          setQuantity(newQty);
                          setInputValue(newQty.toString());
                        }}
                        className="h-10 w-10"
                        disabled={quantity <= (product.minOrderQuantity || 1)}
                        data-testid={`button-decrease-detail-${product.id}`}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex flex-col items-center">
                        <Input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={inputValue}
                          onChange={handleQuantityInputChange}
                          onBlur={handleQuantityInputBlur}
                          onKeyDown={handleQuantityKeyDown}
                          className="w-20 h-10 text-center text-xl font-medium"
                          min={product.minOrderQuantity || 1}
                          data-testid={`input-quantity-detail-${product.id}`}
                        />
                        {quantityError && (
                          <div className="text-xs text-destructive mt-1 text-center">
                            {quantityError}
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newQty = quantity + 1;
                          setQuantity(newQty);
                          setInputValue(newQty.toString());
                        }}
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
{(() => {
                          let priceWithVat = product.priceWithVat;
                          if (selectedVariant && product.variants) {
                            const variant = product.variants.find(v => v.id === selectedVariant);
                            if (variant && variant.priceWithVat !== undefined) {
                              priceWithVat = variant.priceWithVat;
                            }
                          }
                          return formatPrice(priceWithVat * quantity);
                        })()}
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
        
        {/* Image Gallery Lightbox */}
        {product && (() => {
          const allImages = [product.image, ...(product.galleryImages || [])];
          const currentImageIndex = selectedImageIndex !== null ? selectedImageIndex : 0;
          const currentImage = allImages[currentImageIndex];
          
          const goToPreviousImage = () => {
            if (selectedImageIndex === null) return;
            if (selectedImageIndex > 0) {
              setSelectedImageIndex(selectedImageIndex - 1);
            } else {
              setSelectedImageIndex(allImages.length - 1);
            }
          };
          
          const goToNextImage = () => {
            if (selectedImageIndex === null) return;
            if (selectedImageIndex < allImages.length - 1) {
              setSelectedImageIndex(selectedImageIndex + 1);
            } else {
              setSelectedImageIndex(0);
            }
          };
          
          return (
            <Dialog open={selectedImageIndex !== null} onOpenChange={(open) => {
              if (!open) setSelectedImageIndex(null);
            }}>
              <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>{product.name}</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        {currentImageIndex + 1} / {allImages.length}
                      </span>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                
                <div className="relative w-full grid grid-cols-[auto_1fr_auto] items-center gap-4">
                  {/* Left arrow */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white/90 hover:bg-white border-2 shadow-lg justify-self-start"
                    onClick={goToPreviousImage}
                    disabled={allImages.length <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Image container */}
                  <div className="flex justify-center">
                    <img
                      src={currentImage}
                      alt={`${product.name} - obrázok ${currentImageIndex + 1}`}
                      className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    />
                  </div>

                  {/* Right arrow */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white/90 hover:bg-white border-2 shadow-lg justify-self-end"
                    onClick={goToNextImage}
                    disabled={allImages.length <= 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Keyboard navigation hint */}
                {allImages.length > 1 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Použite šípky na klávesnici pre navigáciu
                  </p>
                )}
              </DialogContent>
            </Dialog>
          );
        })()}
      </div>
    </div>
  );
}