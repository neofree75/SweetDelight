import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, Phone, Mail } from 'lucide-react';
import aboutImage from '@assets/generated_images/Cozy_bakery_interior_c998804b.png';

export default function AboutSection() {
  const openingHours = [
    { day: 'Pondelok - Piatok', time: '7:00 - 19:00' },
    { day: 'Sobota', time: '8:00 - 18:00' },
    { day: 'Nedeľa', time: '9:00 - 16:00' }
  ];

  return (
    <section className="py-16 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            O našej cukrárni
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Od roku 2015 prinášame do Bratislavy autentické chuť tradičných slovenských a francúzskych zákuskov.
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
                Začali sme ako malá rodinná cukráreň s veľkými snami. Dnes sme pyšní na to, 
                že každý deň pečieme čerstvé produkty používajúc iba tie najkvalitnejšie suroviny. 
                Naše recepty kombinujú tradičné slovenské postupy s modernými francúzskymi technikami.
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
                        Hlavná 123<br />
                        811 01 Bratislava
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-semibold text-foreground">Telefón</h4>
                      <p className="text-sm text-muted-foreground">+421 2 1234 5678</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-semibold text-foreground">Email</h4>
                      <p className="text-sm text-muted-foreground">info@sladkachvila.sk</p>
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
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2662.2842555493987!2d17.10671731583478!3d48.14816997922141!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x476c895c0d297a13%3A0xaa7da971ba2ed8c0!2sBratislava%2C%20Slovakia!5e0!3m2!1sen!2s!4v1647875400000!5m2!1sen!2s"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Poloha cukrárne Sladká Chvíľa"
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