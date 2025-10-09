import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Phone, Mail, Send, MessageCircle } from 'lucide-react';
import SEO from '@/components/SEO';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // TODO: Integrate with ERPNext - create customer inquiry/lead
    console.log('Submitting contact form:', formData);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    alert('Ďakujeme za vašu správu! Odpovieme vám čo najskôr.');
    setFormData({ name: '', email: '', phone: '', message: '' });
    setIsSubmitting(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openingHours = [
    { day: 'Pondelok', time: 'Zatvorené' },
    { day: 'Utorok - Štvrtok', time: '14:00 - 20:00' },
    { day: 'Piatok - Nedeľa', time: '14:00 - 20:30' }
  ];

  return (
    <>
      <SEO 
        title="Kontakt | Marsela Bakery"
        description="Kontaktujte nás v Marsela Bakery. Máte otázky alebo chcete vytvoriť špecialnu objednávku? Napíšte nám! Nájdete nás v Dvorníkoch, otváracie hodiny: Utorok-Štvrtok 14:00-20:00, Piatok-Nedeľa 14:00-20:30."
        keywords="kontakt, objednávka, otázky, Marsela Bakery, Dvorníky, telefón, email, adresa, otváracie hodiny"
        canonical="/kontakt"
      />
      <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
              Kontaktujte nás
            </h1>
          </div>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Máte otázky alebo chcete vytvoriť špecialnu objednávku? Napíšte nám!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-serif">Napíšte nám</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                      Meno *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Vaše meno"
                      data-testid="input-name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                      Email *
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="vas@email.sk"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                    Telefón
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+421 xxx xxx xxx"
                    data-testid="input-phone"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    Správa *
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Vaša správa..."
                    rows={5}
                    data-testid="textarea-message"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full"
                  data-testid="button-submit"
                >
                  {isSubmitting ? (
                    'Odosielam...'
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Odoslať správu
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Contact Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif">Kontaktné údaje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-semibold text-foreground">Adresa</h4>
                    <p className="text-muted-foreground">
                      Dvorníky 364<br />
                      Dvorníky, Slovakia
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-semibold text-foreground">Telefón</h4>
                    <a href="tel:+421917795731" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-contact-phone">+421 917 795 731</a>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-semibold text-foreground">Email</h4>
                    <a href="mailto:marcelabakery@gmail.com" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-contact-email">marcelabakery@gmail.com</a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opening Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-primary" />
                  Otváracie hodiny
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {openingHours.map((schedule, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-foreground font-medium">{schedule.day}</span>
                      <Badge variant="secondary">{schedule.time}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif">Naša poloha</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg overflow-hidden border border-border">
                  <iframe
                    src="https://www.google.com/maps?q=Dvorn%C3%ADky%20364,%20Dvorn%C3%ADky,%20Slovakia&z=16&output=embed"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Poloha cukrárne Marsela Bakery"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}