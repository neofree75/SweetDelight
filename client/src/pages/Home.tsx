import { useState } from 'react';
import Hero from '@/components/Hero';
import ProductGrid from '@/components/ProductGrid';
import AboutSection from '@/components/AboutSection';
import Cart from '@/components/Cart';
import eclairImage from '@assets/generated_images/Chocolate_éclair_product_e07f4a3d.png';
import croissantImage from '@assets/generated_images/Golden_butter_croissant_3113f28f.png';
import macaronsImage from '@assets/generated_images/Pastel_colored_macarons_d19a6f3c.png';
import tartImage from '@assets/generated_images/Strawberry_fruit_tart_25e81086.png';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

// TODO: Remove mock functionality - replace with real data from ERPNext
const featuredProducts: Product[] = [
  {
    id: '1',
    name: 'Čokoládový Éclair',
    description: 'Klasický francúzsky éclair s vanilkovou plnkou a čokoládovou polevou',
    price: 3.50,
    image: eclairImage,
    category: 'Zákusky',
    inStock: true
  },
  {
    id: '2',
    name: 'Maslový Croissant',
    description: 'Čerstvý, chrumkavý croissant z maslovej chudobnej receptúry',
    price: 2.20,
    image: croissantImage,
    category: 'Pečivo',
    inStock: true
  },
  {
    id: '3',
    name: 'Francúzske Makaróny',
    description: 'Sada 6 kusov makarónov v rôznych príchatiach',
    price: 8.90,
    image: macaronsImage,
    category: 'Zákusky',
    inStock: true
  },
  {
    id: '4',
    name: 'Jahodový Tartaletka',
    description: 'Chrumkavý korpus s vanilkovým krémom a čerstvými jahodami',
    price: 4.20,
    image: tartImage,
    category: 'Torty',
    inStock: false
  }
];

export default function Home() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleAddToCart = (product: Product, quantity: number) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prevItems, {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          image: product.image
        }];
      }
    });
    console.log(`Added ${quantity}x ${product.name} to cart`);
  };

  const handleUpdateCartQuantity = (id: string, quantity: number) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const handleCheckout = () => {
    console.log('Proceeding to checkout with items:', cartItems);
    // TODO: Integrate with ERPNext - create sales order
    setIsCartOpen(false);
  };

  const handleViewDetails = (product: Product) => {
    console.log('Viewing product details:', product.name);
    // TODO: Navigate to product detail page
  };

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      
      <ProductGrid
        products={featuredProducts}
        title="Naše obľúbené produkty"
        onAddToCart={handleAddToCart}
        onViewDetails={handleViewDetails}
      />
      
      <AboutSection />
      
      <Cart
        items={cartItems}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onCheckout={handleCheckout}
      />
    </div>
  );
}