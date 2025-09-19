import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import heroImage from '@assets/generated_images/Bakery_display_case_hero_a86779fc.png';

export default function Hero() {
  return (
    <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.2)), url(${heroImage})`
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold mb-6">
          Marsela Bakery
        </h1>
        <p className="text-xl md:text-2xl font-accent mb-4">
          Ručne vyrábané s láskou
        </p>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-90">
          U nás nájdete slovenské i svetové zákusky a koláče – pripravované denne z kvalitných surovín a s dôrazom na chuť i tradíciu.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/obchod">
            <Button 
              size="lg" 
              className="text-lg px-8 py-3 bg-primary/90 backdrop-blur-sm border border-primary-border"
              data-testid="button-shop-now"
            >
              Objednať teraz
            </Button>
          </Link>
          <Link href="/torta-na-mieru">
            <Button 
              size="lg" 
              className="text-lg px-8 py-3 bg-accent/90 backdrop-blur-sm border border-accent-border text-white"
              data-testid="button-custom-cake"
            >
              Torta na mieru
            </Button>
          </Link>
          <Link href="/o-nas">
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-3 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
              data-testid="button-learn-more"
            >
              Spoznajte nás
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}