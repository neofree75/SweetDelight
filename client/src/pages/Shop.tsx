import { useState } from 'react';
import ProductGrid from '@/components/ProductGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Filter, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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

// Hook to fetch products from ERPNext
function useProducts() {
  return useQuery({
    queryKey: ['/api/products'],
    queryFn: async (): Promise<Product[]> => {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

const categories = ['Všetky', 'Pečivo', 'Zákusky', 'Torty'];

interface ShopProps {
  cartItems: CartItem[];
  onAddToCart: (product: Product, quantity: number) => void;
  onCartOpen: () => void;
}

export default function Shop({ cartItems, onAddToCart, onCartOpen }: ShopProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Všetky');

  // Fetch products from ERPNext
  const { data: allProducts = [], isLoading, error } = useProducts();

  // Filter products by search term and category
  const filteredProducts = allProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Všetky' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: Product, quantity: number) => {
    onAddToCart(product, quantity);
    console.log(`Added ${quantity}x ${product.name} to cart`);
    // Automatically open cart after adding item
    onCartOpen();
  };

  const handleViewDetails = (product: Product) => {
    console.log('Viewing product details:', product.name);
    // Details functionality disabled - focus on cart functionality
    // Product details are already shown on the product card
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Načítavam produkty...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive text-lg mb-4">
              Chyba pri načítavaní produktov
            </p>
            <p className="text-muted-foreground text-sm">
              {error instanceof Error ? error.message : 'Neznáma chyba'}
            </p>
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && !error && (
          <ProductGrid
            products={filteredProducts}
            title={`${filteredProducts.length} produktov${selectedCategory !== 'Všetky' ? ` v kategórii ${selectedCategory}` : ''}`}
            onAddToCart={handleAddToCart}
            onViewDetails={handleViewDetails}
          />
        )}
      </div>
    </div>
  );
}