import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background pt-8">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Obchodné podmienky
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Všeobecné obchodné podmienky pre služby cukrárne Marsela Bakery
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Základné informácie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">1. Základné informácie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Poskytovateľ služieb:</h4>
                <p className="text-muted-foreground">
                  Marsela Bakery<br />
                  Adresa: Dvorníky 364, Dvorníky, Slovakia<br />
                  Telefón: +421 917 795 731<br />
                  Email: marcelabakery@gmail.com
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Predmet podnikania */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">2. Predmet podnikania</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Marsela Bakery poskytuje služby v oblasti výroby a predaja pekárskych a cukrárskych výrobkov, 
                vrátane tortov na mieru, koláčov, dezertov a ďalších sladkých špecialít.
              </p>
            </CardContent>
          </Card>

          {/* Objednávky a platby */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">3. Objednávky a platby</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">3.1 Proces objednávania</h4>
                <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                  <li>Objednávky sa môžu zadávať online cez webstránku alebo telefonicky</li>
                  <li>Každá objednávka musí obsahovať kontaktné údaje zákazníka</li>
                  <li>Pre torty na mieru je potrebné zadať objednávku minimálne 48 hodín vopred</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">3.2 Platobné podmienky</h4>
                <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                  <li>Pre objednávky nad 150€ alebo torty je potrebná záloha 50%</li>
                  <li>Záloha sa platí vopred bankovým prevodom alebo hotovosťou</li>
                  <li>Zvyšná suma sa hradí pri prevzatí tovaru</li>
                  <li>Akceptujeme platby v hotovosti, kartou alebo bankovým prevodom</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Dodacie podmienky */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">4. Dodacie podmienky</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">4.1 Vyzdvihnutie</h4>
                <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                  <li>Štandardné výrobky sú k dispozícii počas otváracích hodín</li>
                  <li>Objednávky na mieru sa vyzdvihujú v dohodnutom termíne</li>
                  <li>Odporúčame vyzdvihnutie do 24 hodín od oznámenia o pripravenosti</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">4.2 Donáška</h4>
                <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                  <li>Poskytujeme donášku v okolí cukrárne</li>
                  <li>Cena donášky sa stanovuje individuálne podľa vzdialenosti</li>
                  <li>Minimálna suma objednávky pre donášku je 30€</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Reklamácie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">5. Reklamácie a vrátenie tovaru</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">5.1 Kvalita produktov</h4>
                <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                  <li>Všetky naše výrobky sú vyrobené z kvalitných surovín</li>
                  <li>V prípade pochybností o kvalite nás kontaktujte do 24 hodín</li>
                  <li>Oprávnené reklamácie riešime výmenou produktu alebo vrátením peňazí</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">5.2 Storno objednávky</h4>
                <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                  <li>Štandardné výrobky možno stornovať do 2 hodín od objednávky</li>
                  <li>Torty na mieru možno stornovať najneskôr 24 hodín pred termínom</li>
                  <li>Pri storno po začatí výroby sa záloha nevracia</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Alergény a skladovanie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">6. Alergény a skladovanie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                <li>Informácie o alergénoch sú dostupné na požiadanie</li>
                <li>V našej prevádzke sa spracúvajú orechy, mlieko, vajcia a lepok</li>
                <li>Výrobky skladujte v chlade a konzumujte do uvedeného dátumu</li>
                <li>Za nesprávne skladovanie zákazníkom nenesieme zodpovednosť</li>
              </ul>
            </CardContent>
          </Card>

          {/* Záverečné ustanovenia */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">7. Záverečné ustanovenia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                <li>Tieto obchodné podmienky nadobúdajú platnosť dňom objednávky</li>
                <li>Zmeny obchodných podmienok budú zverejnené na webstránke</li>
                <li>V prípade sporov sa bude postupovať podľa slovenského práva</li>
                <li>Neplatnosť jednotlivých ustanovení neovplyvní platnosť celých podmienok</li>
              </ul>
              
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  <strong>Posledná aktualizácia:</strong> September 2025
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}