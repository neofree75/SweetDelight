import { useState } from 'react';
import ProductGrid from '@/components/ProductGrid';
import Cart from '@/components/Cart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';
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
const allProducts: Product[] = [
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
  },
  {
    id: '5',
    name: 'Pain au Chocolat',
    description: 'Klasické francúzske pečivo s čokoládou',
    price: 2.80,
    image: croissantImage,
    category: 'Pečivo',
    inStock: true
  },
  {
    id: '6',
    name: 'Vanilkový Éclair',
    description: 'Francúzsky éclair s vanilkovou plnkou a fondánom',
    price: 3.50,
    image: eclairImage,
    category: 'Zákusky',
    inStock: true
  }
];

const categories = ['Všetky', 'Pečivo', 'Zákusky', 'Torty'];

export default function Shop() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Všetky');

  // TODO: Replace with real filtering logic connected to ERPNext
  const filteredProducts = allProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Všetky' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
    <div className="min-h-screen bg-background pt-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Náš obchod
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Vyberte si z našej širokej ponuky čerstvých zákuskov, pečiva a tort.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Hľadať produkty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className="text-sm"
                data-testid={`filter-${category.toLowerCase()}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <ProductGrid
          products={filteredProducts}
          title={`${filteredProducts.length} produktov${selectedCategory !== 'Všetky' ? ` v kategórii ${selectedCategory}` : ''}`}
          onAddToCart={handleAddToCart}
          onViewDetails={handleViewDetails}
        />
      </div>
      
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