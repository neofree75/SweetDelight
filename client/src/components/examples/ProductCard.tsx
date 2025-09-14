import ProductCard from '../ProductCard';
import eclairImage from '@assets/generated_images/Chocolate_éclair_product_e07f4a3d.png';

const mockProduct = {
  id: '1',
  name: 'Čokoládový Éclair',
  description: 'Klasický francúzsky éclair s vanilkovou plnkou a čokoládovou polevou',
  price: 3.50,
  image: eclairImage,
  category: 'Zákusky',
  inStock: true
};

export default function ProductCardExample() {
  return (
    <div className="max-w-sm">
      <ProductCard 
        product={mockProduct}
        onAddToCart={(product, quantity) => console.log('Added to cart:', product.name, 'x', quantity)}
        onViewDetails={(product) => console.log('View details:', product.name)}
      />
    </div>
  );
}