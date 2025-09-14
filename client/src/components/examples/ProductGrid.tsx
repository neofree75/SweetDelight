import ProductGrid from '../ProductGrid';
import eclairImage from '@assets/generated_images/Chocolate_éclair_product_e07f4a3d.png';
import croissantImage from '@assets/generated_images/Golden_butter_croissant_3113f28f.png';
import macaronsImage from '@assets/generated_images/Pastel_colored_macarons_d19a6f3c.png';
import tartImage from '@assets/generated_images/Strawberry_fruit_tart_25e81086.png';

// TODO: Remove mock functionality - replace with real data from ERPNext
const mockProducts = [
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

export default function ProductGridExample() {
  return (
    <ProductGrid 
      products={mockProducts}
      title="Naše obľúbené produkty"
      onAddToCart={(product, quantity) => console.log('Added to cart:', product.name, 'x', quantity)}
      onViewDetails={(product) => console.log('View details:', product.name)}
    />
  );
}