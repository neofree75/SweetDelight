import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus } from 'lucide-react';
import { Product } from '@shared/schema';
import { formatPrice } from '@/lib/format-price';

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
    onAddToCart?.(product, quantity);
    console.log(`Added ${quantity}x ${product.name} to cart`);
  };

  const handleQuantityChange = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when changing quantity
  };

  return (
    <Card className="group hover-elevate cursor-pointer overflow-hidden" onClick={handleCardClick}>
      <div className="aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          data-testid={`img-product-${product.id}`}
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
        
        <div className="flex items-center justify-between">
          <span 
            className="text-xl font-semibold text-primary"
            data-testid={`text-product-price-${product.id}`}
          >
{formatPrice(product.price)}
          </span>
          
          {!product.inStock && (
            <Badge variant="destructive" className="text-xs">
              Vypredané
            </Badge>
          )}
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
                  setQuantity(Math.max(getMinQuantity(), quantity - 1));
                }}
                className="h-8 w-8"
                disabled={quantity <= getMinQuantity()}
                data-testid={`button-decrease-${product.id}`}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <span 
                className="font-medium text-lg w-8 text-center"
                data-testid={`text-quantity-${product.id}`}
              >
                {quantity}
              </span>
              
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  handleQuantityChange(e);
                  setQuantity(quantity + 1);
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