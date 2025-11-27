import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background pt-8">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Ochrana osobných údajov
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Informácie o spracúvaní osobných údajov v cukrárni Marsela Bakery
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Úvod */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">1. Úvodné informácie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Marsela Bakery rešpektuje vaše súkromie a je odhodlaná chrániť vaše osobné údaje. 
                Tento dokument vysvetľuje, ako zbierame, používame a chránime vaše informácie 
                v súlade s Nariadením GDPR a slovenskými zákonmi.
              </p>
              
              <div>
                <h4 className="font-semibold mb-2">Správca osobných údajov:</h4>
                <p className="text-muted-foreground">
                  Marsela Bakery<br />
                  Dvorníky 364, Dvorníky, Slovakia<br />
                  Email: marselabakery@gmail.com<br />
                  Telefón: +421 917 795 731
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Aké údaje zbierame */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">2. Aké osobné údaje zbierame</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">2.1 Údaje pri objednávke</h4>
                <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                  <li>Meno a priezvisko</li>
                  <li>Telefónne číslo</li>
                  <li>Emailová adresa</li>
                  <li>Adresa doručenia (ak je potrebná)</li>
                  <li>Údaje o objednávke a preferenciách</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">2.2 Údaje z webstránky</h4>
                <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                  <li>IP adresa a informácie o prehliadači</li>
                  <li>Údaje o návšteve webstránky (čas, stránky)</li>
                  <li>Cookies a podobné technológie</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Účel spracovania */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">3. Účel spracovania údajov</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">
                Vaše osobné údaje spracúvame pre nasledovné účely:
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">3.1 Spracovanie objednávok</h4>
                  <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                    <li>Prijatie a spracovanie vašej objednávky</li>
                    <li>Komunikácia ohľadom objednávky</li>
                    <li>Doručenie produktov</li>
                    <li>Fakturácia a účtovníctvo</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">3.2 Zlepšenie služieb</h4>
                  <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                    <li>Analýza návštevnosti webstránky</li>
                    <li>Zlepšenie používateľskej skúsenosti</li>
                    <li>Vývoj nových produktov a služieb</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">3.3 Marketing (len so súhlasom)</h4>
                  <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                    <li>Zasielanie newsletterov o novinkách</li>
                    <li>Informácie o akciách a zľavách</li>
                    <li>Pozvánky na špeciálne udalosti</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Právny základ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">4. Právny základ spracovania</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-muted-foreground space-y-3 list-disc ml-6">
                <li><strong>Plnenie zmluvy:</strong> Spracovanie objednávok a poskytovanie služieb</li>
                <li><strong>Oprávnený záujem:</strong> Zlepšenie služieb a komunikácia so zákazníkmi</li>
                <li><strong>Súhlas:</strong> Marketingová komunikácia a cookies (môžete odvolať kedykoľvek)</li>
                <li><strong>Právna povinnosť:</strong> Účtovníctvo a daňové povinnosti</li>
              </ul>
            </CardContent>
          </Card>

          {/* Zdieľanie údajov */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">5. Zdieľanie údajov s tretími stranami</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">
                Vaše osobné údaje zdieľame len v nevyhnutných prípadoch:
              </p>
              
              <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                <li>Doručovacie služby (len údaje potrebné pre doručenie)</li>
                <li>Platobné brány pre spracovanie platieb</li>
                <li>Účtovnícke služby (v súlade so zákonom)</li>
                <li>Právne orgány (ak to vyžaduje zákon)</li>
              </ul>
              
              <p className="text-muted-foreground mt-4">
                <strong>Nepredávame ani neprenajímame vaše údaje tretím stranám na marketingové účely.</strong>
              </p>
            </CardContent>
          </Card>

          {/* Doba uchovania */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">6. Doba uchovávania údajov</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                <li><strong>Objednávky:</strong> 10 rokov (účtovnícke povinnosti)</li>
                <li><strong>Marketingové súhlasy:</strong> Do odvolania súhlasu</li>
                <li><strong>Webové cookies:</strong> 1-2 roky (podľa typu)</li>
                <li><strong>Komunikácia:</strong> 3 roky od posledného kontaktu</li>
              </ul>
            </CardContent>
          </Card>

          {/* Vaše práva */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">7. Vaše práva</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">Máte právo:</p>
              
              <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                <li><strong>Prístup:</strong> Zistiť, aké údaje o vás spracúvame</li>
                <li><strong>Oprava:</strong> Opraviť nesprávne alebo neúplné údaje</li>
                <li><strong>Vymazanie:</strong> Požiadať o vymazanie údajov ("právo byť zabudnutý")</li>
                <li><strong>Obmedzenie:</strong> Obmedziť spracovanie vašich údajov</li>
                <li><strong>Prenosnosť:</strong> Získať vaše údaje v štruktúrovanom formáte</li>
                <li><strong>Námietka:</strong> Namietať proti spracovaniu na základe oprávneného záujmu</li>
                <li><strong>Odvolanie súhlasu:</strong> Kedykoľvek odvolať udelený súhlas</li>
              </ul>
              
              <p className="text-muted-foreground mt-4">
                Pre uplatnenie vašich práv nás kontaktujte na: <strong>marselabakery@gmail.com</strong>
              </p>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">8. Cookies a podobné technológie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">8.1 Čo sú cookies</h4>
                <p className="text-muted-foreground">
                  Cookies sú malé textové súbory, ktoré sa ukladajú vo vašom prehliadači 
                  pri návšteve webstránky. Pomáhajú nám zlepšiť funkčnosť stránky.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">8.2 Typy cookies, ktoré používame</h4>
                <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                  <li><strong>Nevyhnutné:</strong> Pre základnú funkčnosť stránky</li>
                  <li><strong>Funkčné:</strong> Pre zapamätanie vašich preferencií</li>
                  <li><strong>Analytické:</strong> Pre analýzu návštevnosti (so súhlasom)</li>
                </ul>
              </div>
              
              <p className="text-muted-foreground">
                Cookies môžete spravovať v nastaveniach vašeho prehliadača.
              </p>
            </CardContent>
          </Card>

          {/* Bezpečnosť */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">9. Bezpečnosť údajov</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Používame vhodné technické a organizačné opatrenia na ochranu vašich údajov:
              </p>
              
              <ul className="text-muted-foreground space-y-2 list-disc ml-6">
                <li>Šifrovanie citlivých údajov</li>
                <li>Pravidelné bezpečnostné aktualizácie</li>
                <li>Obmedzený prístup len pre oprávnené osoby</li>
                <li>Pravidelné zálohovanie údajov</li>
              </ul>
            </CardContent>
          </Card>

          {/* Kontakt a zmeny */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">10. Kontakt a zmeny</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Kontakt</h4>
                <p className="text-muted-foreground">
                  Ak máte otázky ohľadom ochrany osobných údajov, kontaktujte nás:
                </p>
                <ul className="text-muted-foreground space-y-1 list-disc ml-6 mt-2">
                  <li>Email: marselabakery@gmail.com</li>
                  <li>Telefón: +421 917 795 731</li>
                  <li>Adresa: Dvorníky 364, Dvorníky, Slovakia</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Zmeny tohto dokumentu</h4>
                <p className="text-muted-foreground">
                  Tento dokument môžeme aktualizovať. O významných zmenách vás budeme informovať 
                  prostredníctvom webstránky alebo emailu.
                </p>
              </div>
              
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