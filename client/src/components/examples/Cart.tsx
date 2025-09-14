import { useState } from 'react';
import Cart from '../Cart';
import { Button } from '@/components/ui/button';
import eclairImage from '@assets/generated_images/Chocolate_éclair_product_e07f4a3d.png';
import croissantImage from '@assets/generated_images/Golden_butter_croissant_3113f28f.png';

// TODO: Remove mock functionality - replace with real cart data
const mockCartItems = [
  {
    id: '1',
    name: 'Čokoládový Éclair',
    price: 3.50,
    quantity: 2,
    image: eclairImage
  },
  {
    id: '2',
    name: 'Maslový Croissant',
    price: 2.20,
    quantity: 1,
    image: croissantImage
  }
];

export default function CartExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState(mockCartItems);

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
    console.log('Updated quantity for item', id, 'to', quantity);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    console.log('Removed item', id);
  };

  const handleCheckout = () => {
    console.log('Proceeding to checkout with items:', items);
    setIsOpen(false);
  };

  return (
    <div className="p-4">
      <Button onClick={() => setIsOpen(true)} data-testid="button-open-cart">
        Open Cart ({items.reduce((sum, item) => sum + item.quantity, 0)})
      </Button>
      
      <Cart
        items={items}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />
    </div>
  );
}