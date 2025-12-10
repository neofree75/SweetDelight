import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { UserPlus, CheckCircle, AlertCircle, HelpCircle, Mail, Key, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Registration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    agreeTerms: false
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Základná validácia
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Chyba validácie",
        description: "Prosím vyplňte všetky povinné polia",
        variant: "destructive"
      });
      return;
    }

    if (!formData.agreeTerms) {
      toast({
        title: "Chýba súhlas",
        description: "Pre registráciu musíte súhlasiť s obchodnými podmienkami",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          mobile: formData.mobile || undefined
        })
      });

      const result = await response.json();
      
      console.log('[Registration] API response:', result);
      console.log('[Registration] Response status:', response.status);

      if (!response.ok) {
        // Handle error response
        const errorMessage = result.message || result.error || "Nastala chyba pri registrácii";
        console.error('[Registration] Registration failed:', errorMessage);
        
        // Check if user already exists
        const userExists = errorMessage.toLowerCase().includes('už existuje') || 
                          errorMessage.toLowerCase().includes('already exists');
        
        if (userExists) {
          toast({
            title: "Používateľ už existuje",
            description: "Účet s týmto emailom už existuje. Môžete sa prihlásiť alebo použiť obnovenie hesla.",
            variant: "destructive",
            action: <AlertCircle className="h-4 w-4" />
          });
          // Redirect to login after a short delay
          setTimeout(() => {
            setLocation('/prihlasenie');
          }, 3000);
        } else {
          toast({
            title: "Registrácia neúspešná",
            description: errorMessage,
            variant: "destructive",
            action: <AlertCircle className="h-4 w-4" />
          });
        }
        return;
      }

      if (result.success) {
        toast({
          title: "Registrácia úspešná",
          description: result.message || "Váš účet bol úspešne vytvorený",
          action: <CheckCircle className="h-4 w-4" />
        });
        
        // Presmeruj na prihlásenie po krátkom čase
        setTimeout(() => {
          setLocation('/prihlasenie');
        }, 2000);
      } else {
        toast({
          title: "Registrácia neúspešná",
          description: result.message || "Nastala chyba pri registrácii",
          variant: "destructive",
          action: <AlertCircle className="h-4 w-4" />
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Chyba spojenia",
        description: "Nepodarilo sa spojiť so serverom. Skúste to neskôr.",
        variant: "destructive",
        action: <AlertCircle className="h-4 w-4" />
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl font-serif">Registrácia</CardTitle>
              <p className="text-muted-foreground mt-2">
                Vytvorte si účet pre jednoduchšie objednávanie
              </p>
              <div className="mt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Ako sa zaregistrovať?
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-serif flex items-center gap-2">
                        <HelpCircle className="h-6 w-6 text-primary" />
                        Ako sa zaregistrovať?
                      </DialogTitle>
                      <DialogDescription className="text-base pt-2">
                        Jednoduchý návod pre registráciu vášho účtu
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">1</span>
                          Vyplňte registračný formulár
                        </h3>
                        <p className="text-muted-foreground pl-10">
                          Vyplňte všetky potrebné údaje: vaše meno, priezvisko a emailovú adresu. 
                          Telefónne číslo je voliteľné, ale odporúčame ho zadať pre rýchlejšiu komunikáciu 
                          ohľadom vašich objednávok.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">2</span>
                          Súhlas s podmienkami
                        </h3>
                        <p className="text-muted-foreground pl-10">
                          Pred odoslaním formulára musíte súhlasiť s obchodnými podmienkami a ochranou 
                          osobných údajov. Môžete si ich prečítať kliknutím na príslušné odkazy.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Mail className="h-5 w-5 text-primary" />
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">3</span>
                          Odošlite formulár a skontrolujte email
                        </h3>
                        <p className="text-muted-foreground pl-10">
                          Po kliknutí na tlačidlo "Registrovať sa" vám na zadanú emailovú adresu 
                          príde email s pokynmi na nastavenie hesla. <strong>Dôležité:</strong> Skontrolujte 
                          aj priečinok so spam správami, ak email neuvidíte v hlavnej schránke.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Key className="h-5 w-5 text-primary" />
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">4</span>
                          Nastavte si heslo
                        </h3>
                        <p className="text-muted-foreground pl-10">
                          V emaile nájdete odkaz na nastavenie hesla. Kliknite na neho a nastavte si 
                          bezpečné heslo pre váš účet. Heslo by malo obsahovať aspoň 8 znakov a kombinovať 
                          písmená, čísla a špeciálne znaky.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">5</span>
                          Prihláste sa do svojho účtu
                        </h3>
                        <p className="text-muted-foreground pl-10">
                          Po nastavení hesla sa môžete prihlásiť do svojho účtu pomocou emailovej adresy 
                          a hesla. Odteraz môžete jednoducho objednávať naše výrobky a sledovať stav 
                          vašich objednávok.
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4 mt-6">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-primary" />
                          Dôležité informácie
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>Registrácia je <strong>zadarmo</strong> a trvá len pár minút</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>Ak už máte účet, jednoducho sa <Link href="/prihlasenie" className="text-primary hover:underline">prihláste</Link></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>V prípade problémov s registráciou nás <Link href="/kontakt" className="text-primary hover:underline">kontaktujte</Link></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>Email s pokynmi na nastavenie hesla príde do <strong>niekoľkých minút</strong></span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      Meno *
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Vaše meno"
                      required
                      data-testid="input-firstName"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Priezvisko *
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Vaše priezvisko"
                      required
                      data-testid="input-lastName"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="vasa@email.com"
                    required
                    data-testid="input-email"
                  />
                </div>


                <div>
                  <Label htmlFor="mobile" className="text-sm font-medium">
                    Telefónne číslo
                  </Label>
                  <Input
                    id="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                    placeholder="+421 123 456 789"
                    data-testid="input-mobile"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agreeTerms"
                    checked={formData.agreeTerms}
                    onCheckedChange={(checked) => handleInputChange('agreeTerms', checked as boolean)}
                    data-testid="checkbox-agreeTerms"
                  />
                  <Label htmlFor="agreeTerms" className="text-sm">
                    Súhlasím s{' '}
                    <Link href="/obchodne-podmienky" className="text-primary hover:underline">
                      obchodnými podmienkami
                    </Link>{' '}
                    a{' '}
                    <Link href="/ochrana-udajov" className="text-primary hover:underline">
                      ochranou osobných údajov
                    </Link>
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                  data-testid="button-register"
                >
                  {isLoading ? 'Registrujem...' : 'Registrovať sa'}
                </Button>

                <div className="text-center pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Už máte účet?{' '}
                    <Link href="/prihlasenie" className="text-primary hover:underline font-medium">
                      Prihláste sa
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}