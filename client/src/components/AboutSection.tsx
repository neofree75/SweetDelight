import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, Phone, Mail, Users } from 'lucide-react';
import aboutImage from '@assets/generated_images/Elegant_pastry_shop_interior_new.png';

export default function AboutSection() {
  const openingHours = [
    { day: 'Pondelok', time: 'Zatvorené' },
    { day: 'Utorok - Štvrtok', time: '14:00 - 20:00' },
    { day: 'Piatok - Nedeľa', time: '14:00 - 20:30' }
  ];

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-primary mr-3" />
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
              O našej cukrárni
            </h2>
          </div>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Prinášame autentické chute tradičných aj netradičných zákuskov do nášho regiónu.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="order-2 lg:order-1">
            <img
              src={aboutImage}
              alt="Interiér našej cukrárne"
              className="w-full rounded-lg shadow-lg"
              data-testid="img-about"
            />
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2 space-y-8">
            <div>
              <h3 className="text-2xl font-serif font-semibold text-foreground mb-4">
                Naša história
              </h3>
              <p className="text-muted-foreground leading-relaxed">
              Naše brány sme otvorili v januári 2022, keď sme začali s výrobou a predajom kvalitných cukrárenských výrobkov. Produkciu sme spustili v zrekonštruovaných priestoroch v obci Dvorníky, kde sme o rok neskôr otvorili aj cukráreň so sedením.
              <br/>
<br/>Tu si naši zákazníci môžu vychutnať nielen čerstvé zákusky a torty, ale aj šálku výbornej kávy, čaju, pohár vína či piva a ďalšie dobroty z našej ponuky.
<br/>
<br/>Dbáme na poctivú výrobu, kvalitu surovín a precíznosť každého detailu. Za každým koláčikom stojí srdce, odhodlanie a kreativita nášho cukrárskeho tímu.
<br/>
<br/>Tešíme sa na každú Vašu návštevu a objednávku – s nami si život vychutnáte sladšie. 🍰
              </p>
            </div>

            {/* Contact Info */}
            <div className="grid sm:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Clock className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-foreground">Otváracie hodiny</h4>
                  </div>
                  <div className="space-y-2">
                    {openingHours.map((schedule, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{schedule.day}</span>
                        <span className="font-medium text-foreground">{schedule.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-semibold text-foreground">Adresa</h4>
                      <p className="text-sm text-muted-foreground">
                        Dvorníky 364<br />
                        Dvorníky, Slovakia
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-semibold text-foreground">Telefón</h4>
                      <a href="tel:+421917795731" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-phone">+421 917 795 731</a>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-semibold text-foreground">Email</h4>
                      <a href="mailto:marcelabakery@gmail.com" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-email">marcelabakery@gmail.com</a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Google Maps Embed */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-foreground mb-4 flex items-center">
                  <MapPin className="h-5 w-5 text-primary mr-2" />
                  Naša poloha
                </h4>
                <div className="aspect-video rounded-lg overflow-hidden border border-border">
                  <iframe
                    src="https://www.google.com/maps?q=Dvorn%C3%ADky%20364,%20Dvorn%C3%ADky,%20Slovakia&z=16&output=embed"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Poloha cukrárne Marsela Bakery - Dvorníky 364"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}