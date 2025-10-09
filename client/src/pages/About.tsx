import AboutSection from '@/components/AboutSection';
import SEO from '@/components/SEO';

export default function About() {
  return (
    <>
      <SEO 
        title="O nás | Marsela Bakery"
        description="Spoznajte našu cukráreň Marsela Bakery. Začali sme ako malá rodinná cukráreň s veľkými snami. Dnes sme pyšní na to, že každý deň pečieme čerstvé produkty používajúc iba tie najkvalitnejšie suroviny."
        keywords="o nás, história, cukráreň, rodinná cukráreň, tradičné receptúry, kvalitné suroviny, Marsela Bakery, Dvorníky"
        canonical="/o-nas"
      />
      <div className="min-h-screen bg-background">
        <AboutSection />
      </div>
    </>
  );
}