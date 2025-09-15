import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, X, ShoppingBag } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartProps {
  items: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export default function Cart({ 
  items, 
  isOpen, 
  onClose, 
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout 
}: CartProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-card-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="h-full rounded-none border-0 shadow-none">
          <CardHeader className="border-b border-card-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-serif">
                Košík ({totalItems})
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="button-close-cart"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-0">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Váš košík je prázdny
                </h3>
                <p className="text-muted-foreground">
                  Pridajte si produkty z nášho obchodu
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-6">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center space-x-4 p-4 border border-card-border rounded-lg"
                    data-testid={`cart-item-${item.id}`}
                  >
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="h-16 w-16 object-cover rounded-md"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {item.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        €{item.price.toFixed(2)} každý
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="h-8 w-8"
                        data-testid={`button-decrease-cart-${item.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span 
                        className="w-8 text-center font-medium"
                        data-testid={`text-cart-quantity-${item.id}`}
                      >
                        {item.quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="h-8 w-8"
                        data-testid={`button-increase-cart-${item.id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      data-testid={`button-remove-cart-${item.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {items.length > 0 && (
            <div className="border-t border-card-border p-6 space-y-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Celkom:</span>
                <span data-testid="text-cart-total">€{totalPrice.toFixed(2)}</span>
              </div>
              
              <Button 
                className="w-full"
                size="lg"
                variant="outline"
                onClick={onClose}
                data-testid="button-continue-shopping"
              >
                Pokračovať v nákupe
              </Button>
              
              <Button 
                className="w-full"
                size="lg"
                onClick={onCheckout}
                data-testid="button-checkout"
              >
                Pokračovať k objednávke
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}