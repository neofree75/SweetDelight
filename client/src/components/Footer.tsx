import { Link } from 'wouter';
import { Facebook, Instagram, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-serif font-bold mb-4">Sladká Chvíľa</h3>
            <p className="text-background/80 leading-relaxed mb-6 max-w-md">
              Tradičná slovenská cukráreň s modernými francouzskymi technikani. 
              Pečieme s láskou každý deň od roku 2015.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-background/80 hover:text-background hover:bg-background/10"
                data-testid="link-facebook"
              >
                <Facebook className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-background/80 hover:text-background hover:bg-background/10"
                data-testid="link-instagram"
              >
                <Instagram className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Rýchle odkazy</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" data-testid="footer-link-home">
                  <span className="text-background/80 hover:text-background transition-colors">
                    Domov
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/obchod" data-testid="footer-link-shop">
                  <span className="text-background/80 hover:text-background transition-colors">
                    Obchod
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/o-nas" data-testid="footer-link-about">
                  <span className="text-background/80 hover:text-background transition-colors">
                    O nás
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/kontakt" data-testid="footer-link-contact">
                  <span className="text-background/80 hover:text-background transition-colors">
                    Kontakt
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">Kontakt</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-background/60" />
                <span className="text-background/80 text-sm">
                  Dvorníky 364<br />
                  Dvorníky, Slovakia
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-background/60" />
                <a 
                  href="tel:+421917795731" 
                  className="text-background/80 hover:text-background text-sm transition-colors"
                  data-testid="footer-phone"
                >
                  +421 917 795 731
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-background/60" />
                <a 
                  href="mailto:marcelabakery@gmail.com" 
                  className="text-background/80 hover:text-background text-sm transition-colors"
                  data-testid="footer-email"
                >
                  marcelabakery@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-background/60 text-sm">
            © {currentYear} Sladká Chvíľa. Všetky práva vyhradené.
          </p>
          
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/ochrana-osobnych-udajov" data-testid="footer-link-privacy">
              <span className="text-background/60 hover:text-background text-sm transition-colors">
                Ochrana osobných údajov
              </span>
            </Link>
            <Link href="/obchodne-podmienky" data-testid="footer-link-terms">
              <span className="text-background/60 hover:text-background text-sm transition-colors">
                Obchodné podmienky
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}