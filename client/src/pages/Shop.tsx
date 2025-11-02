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
      try {
        console.log('[Shop] Fetching products from /api/products...');
        const response = await fetch('/api/products', {
          cache: 'no-cache', // Disable browser cache
          headers: {
            'Cache-Control': 'no-cache',
            'Accept': 'application/json'
          }
        });
        
        console.log('[Shop] Response status:', response.status);
        console.log('[Shop] Response headers:', {
          'content-type': response.headers.get('content-type')
        });
        
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('[Shop] Received non-JSON response:', text.substring(0, 200));
          throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}. This usually means nginx is not forwarding API requests correctly.`);
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Shop] API error:', errorText);
          throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[Shop] Received products:', Array.isArray(data) ? data.length : 'not an array', data);
        
        if (!Array.isArray(data)) {
          console.error('[Shop] Response is not an array:', data);
          throw new Error('Invalid response format: expected array');
        }
        
        return data;
      } catch (error) {
        console.error('[Shop] Error fetching products:', error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds (reduced for testing)
    retry: 2,
    retryDelay: 1000,
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
          <div className="text-center py-12 max-w-2xl mx-auto">
            <p className="text-destructive text-lg mb-4">
              Chyba pri načítavaní produktov
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              {error instanceof Error ? error.message : 'Neznáma chyba'}
            </p>
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Technické detaily (pre vývojárov)
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
              variant="outline"
            >
              Obnoviť stránku
            </Button>
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