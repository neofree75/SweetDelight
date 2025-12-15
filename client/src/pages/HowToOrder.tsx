import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  CheckCircle, 
  CreditCard, 
  Truck, 
  MapPin,
  Clock,
  Phone,
  Mail,
  HelpCircle,
  ArrowRight,
  Check
} from 'lucide-react';
import SEO from '@/components/SEO';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function HowToOrder() {
  const steps = [
    {
      number: 1,
      title: 'Prehľadajte našu ponuku',
      description: 'Navštívte našu stránku Obchod a prehľadajte širokú ponuku čerstvých zákuskov, tort a dezertov. Môžete filtrovať podľa kategórie, ceny alebo dostupnosti.',
      icon: Search,
      link: '/obchod',
      linkText: 'Prejsť do obchodu'
    },
    {
      number: 2,
      title: 'Pridajte produkty do košíka',
      description: 'Kliknite na produkt, ktorý sa vám páči, vyberte množstvo a pridajte ho do košíka. Môžete pridať viacero produktov naraz. V košíku môžete kedykoľvek upraviť množstvo alebo odstrániť produkty.',
      icon: Plus,
      link: '/obchod',
      linkText: 'Začať nakupovať'
    },
    {
      number: 3,
      title: 'Prejdite na pokladňu',
      description: 'Keď máte všetko, čo potrebujete, kliknite na tlačidlo "Pokračovať na pokladňu". Skontrolujte svoju objednávku a vyplňte kontaktné údaje.',
      icon: ShoppingCart,
      link: '/checkout',
      linkText: 'Prejsť na pokladňu'
    },
    {
      number: 4,
      title: 'Vyberte spôsob doručenia',
      description: 'Môžete si vybrať medzi vyzdvihnutím v našej cukrárni alebo doručením na vašu adresu. Pri doručení si môžete vybrať preferovaný čas.',
      icon: Truck,
      link: null,
      linkText: null
    },
    {
      number: 5,
      title: 'Dokončite platbu',
      description: 'Vyberte si spôsob platby (bankovým prevodom alebo hotovosťou pri vyzdvihnutí). Po úspešnej platbe dostanete potvrdenie na email.',
      icon: CreditCard,
      link: null,
      linkText: null
    },
    {
      number: 6,
      title: 'Čakajte na potvrdenie',
      description: 'Po odoslaní objednávky vám pošleme email s potvrdením a detailmi objednávky. Ak bude objednávka dokončená tak Vám pošleme email s potvrdením so zmenou statusu objednávky. V prípade otázok vás budeme kontaktovať.',
      icon: CheckCircle,
      link: null,
      linkText: null
    }
  ];

  const deliveryOptions = [
    {
      title: 'Vyzdvihnutie v cukrárni',
      description: 'Zadarmo',
      details: 'Môžete si objednávku vyzdvihnúť v našej cukrárni v Dvorníkoch. Otváracie hodiny: Utorok-Štvrtok 14:00-20:00, Piatok-Nedeľa 14:00-20:30.',
      icon: MapPin
    },
    {
      title: 'Doručenie na adresu',
      description: 'Podľa vzdialenosti',
      details: 'Doručujeme v okolí Dvorníkov. Cena doručenia sa vypočíta podľa vzdialenosti. Kontaktujte nás pre presnú cenu.',
      icon: Truck
    }
  ];

  const paymentMethods = [
    {
      title: 'Bankový prevod',
      description: 'Platba na účet pred doručením',
      icon: CreditCard
    },
    {
      title: 'Hotovosť',
      description: 'Pri vyzdvihnutí v cukrárni',
      icon: CreditCard
    }
  ];

  const faqs = [
    {
      question: 'Ako dlho trvá spracovanie objednávky?',
      answer: 'Objednávky spracovávame do 24 hodín. Pre špeciálne torty na mieru odporúčame objednať aspoň 3-5 dní vopred. V prípade urgentných objednávok nás kontaktujte telefonicky.'
    },
    {
      question: 'Môžem zmeniť alebo zrušiť objednávku?',
      answer: 'Áno, objednávku môžete zmeniť alebo zrušiť do 24 hodín po odoslaní. Kontaktujte nás telefonicky alebo emailom. Po tomto čase môže byť zmena alebo zrušenie zpoplatnené.'
    },
    {
      question: 'Aké sú minimálne množstvá pre objednávku?',
      answer: 'Minimálne množstvo sa líši podľa produktu a je uvedené na každej produktovej stránke. Pre špeciálne torty na mieru môže byť minimálne množstvo vyššie.'
    },
    {
      question: 'Doručujete aj mimo Dvorníkov?',
      answer: 'Áno, doručujeme aj do okolitých miest. Cena doručenia závisí od vzdialenosti. Pre presnú cenu a dostupnosť doručenia nás kontaktujte.'
    },
    {
      question: 'Môžem objednať tortu na mieru?',
      answer: 'Áno, ponúkame torty na mieru. Navštívte našu stránku "Torta na mieru" a vyplňte formulár s vašimi požiadavkami. Kontaktujeme vás s návrhom a cenovou ponukou.'
    },
    {
      question: 'Ako dlho vydrží produkt čerstvý?',
      answer: 'Všetky naše produkty sú čerstvé a pečieme ich denne. Zákusky a pečivo odporúčame spotrebovať do 2-3 dní. Torty vydržia 3-5 dní pri správnom skladovaní v chladničke.'
    },
    {
      question: 'Máte produkty bez lepku alebo pre alergikov?',
      answer: 'Niektoré naše produkty sú bez lepku alebo vhodné pre alergikov. Informácie o alergénoch nájdete na každej produktovej stránke. V prípade špecifických požiadaviek nás kontaktujte.'
    },
    {
      question: 'Ako môžem sledovať stav mojej objednávky?',
      answer: 'Po odoslaní objednávky dostanete email s potvrdením a číslom objednávky. V prípade otázok nás môžete kontaktovať telefonicky alebo emailom s číslom objednávky.'
    }
  ];

  return (
    <>
      <SEO 
        title="Ako objednať | Marsela Bakery"
        description="Jednoduchý návod, ako objednať čerstvé zákusky a torty v Marsela Bakery. Krok za krokom prehľad objednávacieho procesu, spôsobov doručenia a platby."
        keywords="ako objednať, objednávka online, doručenie, platba, vyzdvihnutie, Marsela Bakery, návod na objednávku"
        canonical="/ako-objednat"
        breadcrumbs={[
          { name: 'Domov', url: '/' },
          { name: 'Ako objednať', url: '/ako-objednat' }
        ]}
      />
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <ShoppingCart className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
                Ako objednať
              </h1>
            </div>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Jednoduchý návod na objednávanie čerstvých zákuskov a tort v našej cukrárni
            </p>
          </div>

          {/* Quick Start CTA */}
          <Card className="mb-12 bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-serif font-bold mb-2">Pripravení začať?</h2>
                  <p className="text-muted-foreground">
                    Prejdite do nášho obchodu a vyberte si z našej širokej ponuky
                  </p>
                </div>
                <Link href="/obchod">
                  <Button size="lg" className="w-full md:w-auto">
                    Prejsť do obchodu
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Steps */}
          <div className="mb-16">
            <h2 className="text-2xl font-serif font-bold text-center mb-8">
              Proces objednávky v 6 krokoch
            </h2>
            <div className="space-y-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card key={step.number} className="relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Step Number & Icon */}
                        <div className="flex items-center gap-4 md:w-48">
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-bold text-lg">{step.number}</span>
                          </div>
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center md:hidden">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Icon className="h-5 w-5 text-primary hidden md:block" />
                            <h3 className="text-xl font-serif font-bold">{step.title}</h3>
                          </div>
                          <p className="text-muted-foreground mb-4">{step.description}</p>
                          {step.link && (
                            <Link href={step.link}>
                              <Button variant="outline" size="sm">
                                {step.linkText}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Delivery Options */}
          <div className="mb-16">
            <h2 className="text-2xl font-serif font-bold text-center mb-8">
              Spôsoby doručenia
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {deliveryOptions.map((option, index) => {
                const Icon = option.icon;
                return (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{option.title}</CardTitle>
                          <Badge variant="secondary" className="mt-1">{option.description}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{option.details}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mb-16">
            <h2 className="text-2xl font-serif font-bold text-center mb-8">
              Spôsoby platby
            </h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {paymentMethods.map((method, index) => {
                const Icon = method.icon;
                return (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="inline-flex p-3 rounded-full bg-primary/10 mb-4">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2">{method.title}</h3>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Important Information */}
          <Card className="mb-16 bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Dôležité informácie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Objednávky spracovávame do 24 hodín</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Pre torty na mieru odporúčame objednať 3-5 dní vopred</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Všetky produkty sú čerstvé a pečieme ich denne</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Po odoslaní objednávky dostanete email s potvrdením</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>V prípade otázok nás môžete kontaktovať telefonicky alebo emailom</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-2">
                <HelpCircle className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-serif font-bold">
                  Často kladené otázky
                </h2>
              </div>
              <p className="text-muted-foreground">
                Odpovede na najčastejšie otázky týkajúce sa objednávok
              </p>
            </div>
            <Accordion type="single" collapsible className="max-w-3xl mx-auto">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Contact CTA */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-2xl font-serif font-bold mb-4">
                  Potrebujete pomoc?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Ak máte akékoľvek otázky alebo potrebujete pomoc s objednávkou, neváhajte nás kontaktovať. Sme tu pre vás!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="tel:+421917795731">
                    <Button variant="outline" size="lg">
                      <Phone className="mr-2 h-4 w-4" />
                      +421 917 795 731
                    </Button>
                  </a>
                  <a href="mailto:marselabakery@gmail.com">
                    <Button variant="outline" size="lg">
                      <Mail className="mr-2 h-4 w-4" />
                      marselabakery@gmail.com
                    </Button>
                  </a>
                  <Link href="/kontakt">
                    <Button size="lg">
                      Kontaktný formulár
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

