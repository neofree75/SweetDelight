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
import { LogIn, Eye, EyeOff, CheckCircle, AlertCircle, HelpCircle, Mail, Key, Lock, Shield, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoginProps {
  onLogin?: (userData: { email: string; name: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Základná validácia
    if (!formData.email || !formData.password) {
      toast({
        title: "Chyba validácie",
        description: "Prosím vyplňte email a heslo",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const contentType = response.headers.get('content-type');
      let result;

      // Pokus sa parsovať JSON response
      try {
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          // Ak nie je JSON, načítaj ako text pre debug
          const htmlText = await response.text();
          throw new Error('Server returned non-JSON response');
        }
      } catch (parseError) {
        throw new Error(`Failed to parse server response: ${parseError}`);
      }

      // Skontroluj či bola operácia úspešná
      if (response.ok && result.success && result.user) {
        toast({
          title: "Prihlásenie úspešné",
          description: `Vitajte, ${result.user.name}!`,
          action: <CheckCircle className="h-4 w-4" />
        });

        if (onLogin) {
          onLogin(result.user);
        }
        
        // Presmeruj na domovskú stránku po krátkom čase
        setTimeout(() => {
          setLocation('/');
        }, 1500);
      } else {
        // Spracuj API chyby (401, 403, atď.)
        let errorMessage = "Neplatné prihlasovacie údaje";
        
        if (result && result.message) {
          errorMessage = result.message;
        } else if (response.status === 401) {
          errorMessage = "Neplatné prihlasovacie údaje";
        } else if (response.status === 403) {
          errorMessage = "Prístup zamietnutý";
        } else if (response.status >= 500) {
          errorMessage = "Chyba servera. Skúste to neskôr.";
        }

        toast({
          title: "Prihlásenie neúspešné",
          description: errorMessage,
          variant: "destructive",
          action: <AlertCircle className="h-4 w-4" />
        });
      }
    } catch (error) {
      console.error('Login error:', error);
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
              <LogIn className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl font-serif">Prihlásenie</CardTitle>
              <p className="text-muted-foreground mt-2">
                Prihláste sa do svojho účtu
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
                      Ako sa prihlásiť?
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-serif flex items-center gap-2">
                        <HelpCircle className="h-6 w-6 text-primary" />
                        Ako sa prihlásiť?
                      </DialogTitle>
                      <DialogDescription className="text-base pt-2">
                        Jednoduchý návod pre prihlásenie do vášho účtu
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Mail className="h-5 w-5 text-primary" />
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">1</span>
                          Zadajte svoju emailovú adresu
                        </h3>
                        <p className="text-muted-foreground pl-10">
                          Do prvého poľa zadajte emailovú adresu, ktorú ste použili pri registrácii. 
                          Uistite sa, že je email správne napísaný - malé a veľké písmená nezáležia, 
                          ale všetky znaky musia byť správne.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Key className="h-5 w-5 text-primary" />
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">2</span>
                          Zadajte svoje heslo
                        </h3>
                        <p className="text-muted-foreground pl-10">
                          Do druhého poľa zadajte heslo, ktoré ste si nastavili pri registrácii. 
                          Heslo je citlivé na veľké a malé písmená, takže dávajte pozor na správny 
                          zápis. Môžete si heslo zobraziť kliknutím na ikonu oka.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-primary" />
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">3</span>
                          Kliknite na "Prihlásiť sa"
                        </h3>
                        <p className="text-muted-foreground pl-10">
                          Po vyplnení oboch polí kliknite na tlačidlo "Prihlásiť sa". Ak sú údaje 
                          správne, budete prihlásení a presmerovaní na hlavnú stránku. Odteraz môžete 
                          objednávať naše výrobky a sledovať stav vašich objednávok.
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4 mt-6 space-y-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-primary" />
                          Čo robiť ak...
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <Lock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium mb-1">Zabudli ste heslo?</p>
                              <p className="text-muted-foreground">
                                Kliknite na odkaz <Link href="/zabudnute-heslo" className="text-primary hover:underline">"Zabudli ste heslo?"</Link> pod 
                                prihlasovacím formulárom. Na vašu emailovú adresu vám príde odkaz na 
                                obnovenie hesla.
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <UserPlus className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium mb-1">Nemáte ešte účet?</p>
                              <p className="text-muted-foreground">
                                Ak ste sa ešte nezaregistrovali, kliknite na odkaz <Link href="/registracia" className="text-primary hover:underline">"Registrujte sa"</Link> 
                                v spodnej časti formulára. Registrácia je jednoduchá a trvá len pár minút.
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium mb-1">Neplatné prihlasovacie údaje?</p>
                              <p className="text-muted-foreground">
                                Skontrolujte, či ste správne zadali email a heslo. Uistite sa, že máte 
                                zapnuté správne písanie (CAPS LOCK). Ak problém pretrváva, použite 
                                obnovenie hesla alebo nás <Link href="/kontakt" className="text-primary hover:underline">kontaktujte</Link>.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-primary/5 rounded-lg p-4 mt-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          Bezpečnostné tipy
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>Nikdy nezdieľajte svoje heslo s nikým</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>Používajte silné heslo s kombináciou písmen, čísiel a špeciálnych znakov</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>Ak používate verejný počítač, nezabudnite sa odhlásiť po dokončení</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>Funkcia "Zapamätať si ma" je vhodná len pre vaše osobné zariadenia</span>
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
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
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
                  <Label htmlFor="password" className="text-sm font-medium">
                    Heslo
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Vaše heslo"
                      required
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) => handleInputChange('rememberMe', checked as boolean)}
                      data-testid="checkbox-rememberMe"
                    />
                    <Label htmlFor="rememberMe" className="text-sm">
                      Zapamätať si ma
                    </Label>
                  </div>
                  
                  <Link href="/zabudnute-heslo" className="text-sm text-primary hover:underline">
                    Zabudli ste heslo?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? 'Prihlasuje...' : 'Prihlásiť sa'}
                </Button>

                <div className="text-center pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Nemáte ešte účet?{' '}
                    <Link href="/registracia" className="text-primary hover:underline font-medium">
                      Registrujte sa
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