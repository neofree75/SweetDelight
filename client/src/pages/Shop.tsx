import { useState, useEffect } from 'react';
import ProductGrid from '@/components/ProductGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Filter, Loader2, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import SEO from '@/components/SEO';

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

const PRODUCTS_PER_PAGE = 20;

interface ShopProps {
  cartItems: CartItem[];
  onAddToCart: (product: Product, quantity: number) => void;
  onCartOpen: () => void;
}

export default function Shop({ cartItems, onAddToCart, onCartOpen }: ShopProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Všetky');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch products from ERPNext
  const { data: allProducts = [], isLoading, error } = useProducts();

  // Dynamicky generuj kategórie z produktov
  const categories = ['Všetky', ...Array.from(new Set(allProducts.map(product => product.category).filter(Boolean))).sort()];

  // Reset stránku pri zmene filtrov
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Filter products by search term and category
  const filteredProducts = allProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Všetky' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  const shouldShowPagination = filteredProducts.length > PRODUCTS_PER_PAGE;

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
    <>
      <SEO 
        title="Náš obchod | Marsela Bakery"
        description="Prehľadajte našu širokú ponuku čerstvých zákuskov, pečiva a tort. Vyberte si z tradičných slovenských receptúr a moderných dezertov. Objednajte online na vyzdvihnutie."
        keywords="obchod, zákusky, pečivo, torty, tradičné receptúry, objednávka online, čerstvé produkty, Marsela Bakery"
        canonical="/obchod"
      />
      <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <ShoppingBag className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
              Náš obchod
            </h1>
          </div>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
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
          <>
            <ProductGrid
              products={paginatedProducts}
              title={`${filteredProducts.length} produktov${selectedCategory !== 'Všetky' ? ` v kategórii ${selectedCategory}` : ''}${shouldShowPagination ? ` - stránka ${currentPage} z ${totalPages}` : ''}`}
              onAddToCart={handleAddToCart}
              onViewDetails={handleViewDetails}
            />
            
            {/* Pagination */}
            {shouldShowPagination && (
              <div className="flex justify-center items-center gap-2 mt-8 mb-16">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Predchádzajúca
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      data-testid={`button-page-${page}`}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Nasledujúca
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </>
  );
}