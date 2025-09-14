import ProductCard from './ProductCard';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

interface ProductGridProps {
  products: Product[];
  title?: string;
  onAddToCart?: (product: Product, quantity: number) => void;
  onViewDetails?: (product: Product) => void;
}

export default function ProductGrid({ 
  products, 
  title = "Naše produkty",
  onAddToCart, 
  onViewDetails 
}: ProductGridProps) {
  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Čerstvé pečenie každý deň. Tradičné receptúry spojené s moderným prístupom.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
        
        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Žiadne produkty nenájdené.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}