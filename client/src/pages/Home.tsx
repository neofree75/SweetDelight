import { useQuery } from '@tanstack/react-query';
import Hero from '@/components/Hero';
import ProductGrid from '@/components/ProductGrid';
import AboutSection from '@/components/AboutSection';
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

interface HomeProps {
  cartItems: CartItem[];
  onAddToCart: (product: Product, quantity: number) => void;
  onCartOpen: () => void;
}

export default function Home({ cartItems, onAddToCart, onCartOpen }: HomeProps) {
  
  // Načítaj obľúbené produkty z ERPNext
  const { data: featuredProducts = [], isLoading, error } = useFeaturedProducts();

  const handleAddToCart = (product: Product, quantity: number) => {
    onAddToCart(product, quantity);
    onCartOpen(); // Automatically open cart after adding item
  };


  const handleViewDetails = (product: Product) => {
    console.log('Viewing product details:', product.name);
    // TODO: Navigate to product detail page
  };

  return (
    <>
      <SEO 
        title="Marsela Bakery - Artisan cukráreň | Čerstvé zákusky a torty"
        description="Odkryjte ručne vyrobené zákusky, čerstvé torty a artisan dezerty v Marsela Bakery. Objednajte online na vyzdvihnutie alebo doručenie. Prémiová kvalita, tradičné receptúry, moderná chuť."
        keywords="cukráreň, zákusky, torty, dezerty, Marsela Bakery, Dvorníky, objednávka online, čerstvé pečivo, tradičné receptúry, artisan cukráreň"
        canonical="/"
      />
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
      </div>
    </>
  );
}