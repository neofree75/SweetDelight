import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Hero from '@/components/Hero';
import ProductGrid from '@/components/ProductGrid';
import AboutSection from '@/components/AboutSection';
import Cart from '@/components/Cart';

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

// Hook na načítanie produktov z ERPNext
function useFeaturedProducts() {
  return useQuery({
    queryKey: ['/api/products', 'featured'],
    queryFn: async (): Promise<Product[]> => {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const allProducts = await response.json();
      // Zobraz iba prvé 4 produkty pre featured sekciu
      return allProducts.slice(0, 4);
    },
    staleTime: 5 * 60 * 1000, // 5 minút
  });
}

export default function Home() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Načítaj obľúbené produkty z ERPNext
  const { data: featuredProducts = [], isLoading, error } = useFeaturedProducts();

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
      
      {/* Zobraz loading alebo error state */}
      {isLoading ? (
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <p className="text-muted-foreground text-lg">Načítavajú sa produkty...</p>
            </div>
          </div>
        </section>
      ) : error ? (
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <p className="text-muted-foreground text-lg">Nepodarilo sa načítať produkty</p>
            </div>
          </div>
        </section>
      ) : (
        <ProductGrid
          products={featuredProducts}
          title="Naše obľúbené produkty"
          onAddToCart={handleAddToCart}
          onViewDetails={handleViewDetails}
        />
      )}
      
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