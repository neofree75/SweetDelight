import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Minus } from 'lucide-react';
import { Product } from '@shared/schema';
import { formatPrice } from '@/lib/format-price';
import logo from '@assets/logo_1757937077215.png';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product, quantity: number) => void;
  onViewDetails?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  const [, setLocation] = useLocation();
  // Minimálny počet z ERPNext alebo 1 ako fallback
  const getMinQuantity = () => Number(product.minOrderQuantity) || 1;
  const [quantity, setQuantity] = useState(getMinQuantity());
  const [inputValue, setInputValue] = useState(getMinQuantity().toString());
  const [quantityError, setQuantityError] = useState('');

  // Get product image or fallback to logo
  const getProductImage = () => {
    if (!product.image || product.image === '' || product.image === '/placeholder-product.jpg' || product.image.includes('placeholder')) {
      return logo;
    }
    return product.image;
  };


  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails?.(product);
    console.log(`Viewing details for ${product.name}`);
  };

  const handleCardClick = () => {
    setLocation(`/produkt/${product.id}`);
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking add to cart
    
    // Parse and commit the current input value before adding to cart
    const currentValue = parseInt(inputValue) || 0;
    const minQty = getMinQuantity();
    const finalQuantity = currentValue < minQty ? minQty : currentValue;
    
    // Update state to committed value and clear errors
    setQuantity(finalQuantity);
    setInputValue(finalQuantity.toString());
    setQuantityError('');
    
    // Use the committed quantity for add to cart
    onAddToCart?.(product, finalQuantity);
    console.log(`Added ${finalQuantity}x ${product.name} to cart`);
  };

  const handleQuantityChange = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when changing quantity
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const inputVal = e.target.value;
    setInputValue(inputVal);
    // No validation during typing - errors only shown on blur/Enter
  };

  const handleQuantityInputBlur = () => {
    const value = parseInt(inputValue) || 0;
    const minQty = getMinQuantity();
    
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

  return (
    <Card className="group hover-elevate cursor-pointer overflow-hidden" onClick={handleCardClick}>
      <div className="aspect-square overflow-hidden">
        <img
          src={getProductImage()}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          data-testid={`img-product-${product.id}`}
          onError={(e) => {
            // Fallback to logo if image fails to load
            const target = e.target as HTMLImageElement;
            if (target.src !== logo) {
              target.src = logo;
            }
          }}
        />
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 
            className="font-serif text-lg font-semibold text-foreground line-clamp-1"
            data-testid={`text-product-name-${product.id}`}
          >
            {product.name}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {product.category}
          </Badge>
        </div>
        
        <p 
          className="text-muted-foreground text-sm mb-3 line-clamp-2"
          data-testid={`text-product-description-${product.id}`}
        >
          {product.description}
        </p>
        
        <div className="space-y-1">
          {/* Price with VAT (main price) */}
          <div className="flex items-center justify-between">
            <span 
              className="text-xl font-semibold text-primary"
              data-testid={`text-product-price-with-vat-${product.id}`}
            >
              {formatPrice(product.priceWithVat)}
            </span>
            
            {!product.inStock && (
              <Badge variant="destructive" className="text-xs">
                Vypredané
              </Badge>
            )}
          </div>
          
          {/* Price without VAT and VAT rate */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span data-testid={`text-product-price-without-vat-${product.id}`}>
              bez DPH: {formatPrice(product.price)}
            </span>
            <span data-testid={`text-product-vat-rate-${product.id}`}>
              DPH {product.vatRate}%
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        {product.inStock ? (
          <div className="w-full space-y-3">
            {/* Minimum quantity notice */}
            {getMinQuantity() > 1 && (
              <div className="text-xs text-muted-foreground text-center w-full">
                Min. objednávka: {getMinQuantity()} ks
              </div>
            )}
            
            {/* Quantity Selector */}
            <div className="flex items-center justify-center space-x-3">
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  handleQuantityChange(e);
                  const newQty = Math.max(getMinQuantity(), quantity - 1);
                  setQuantity(newQty);
                  setInputValue(newQty.toString());
                }}
                className="h-8 w-8"
                disabled={quantity <= getMinQuantity()}
                data-testid={`button-decrease-${product.id}`}
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
                  onClick={(e) => e.stopPropagation()}
                  className="w-16 h-8 text-center text-lg font-medium"
                  min={getMinQuantity()}
                  data-testid={`input-quantity-${product.id}`}
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
                onClick={(e) => {
                  handleQuantityChange(e);
                  const newQty = quantity + 1;
                  setQuantity(newQty);
                  setInputValue(newQty.toString());
                }}
                className="h-8 w-8"
                data-testid={`button-increase-${product.id}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Add to Cart Button */}
            <Button 
              className="w-full"
              onClick={handleAddToCartClick}
              data-testid={`button-add-to-cart-${product.id}`}
            >
              Pridať do košíka
            </Button>
          </div>
        ) : (
          <Button disabled className="w-full" data-testid={`button-out-of-stock-${product.id}`}>
            Nie je skladom
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}