import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';
import { Link } from 'wouter';

const COOKIE_CONSENT_KEY = 'cookie-consent-accepted';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Skontroluj, či už bol súhlas daný
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Zobraz banner s malým oneskorením pre lepší UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'false');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-500">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-foreground leading-relaxed">
                Táto stránka používa cookies na zlepšenie vášho zážitku a analýzu návštevnosti. 
                Pokračovaním v prehliadaní súhlasíte s používaním cookies v súlade s našou{' '}
                <Link 
                  href="/ochrana-osobnych-udajov" 
                  className="text-primary hover:underline font-medium"
                >
                  politikou ochrany osobných údajov
                </Link>
                .
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              className="whitespace-nowrap flex-1 md:flex-initial"
            >
              Odmietnuť
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="whitespace-nowrap flex-1 md:flex-initial"
            >
              Súhlasiť
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

