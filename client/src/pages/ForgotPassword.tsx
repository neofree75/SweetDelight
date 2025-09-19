import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle, Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Základná validácia
    if (!email) {
      toast({
        title: "Chyba validácie",
        description: "Prosím zadajte emailovú adresu",
        variant: "destructive"
      });
      return;
    }

    // Validácia emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Neplatný email",
        description: "Prosím zadajte platnú emailovú adresu",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email
        })
      });

      const result = await response.json();

      if (result.success) {
        setIsSuccess(true);
        toast({
          title: "Email odoslaný",
          description: "Ak účet existuje, na váš email sme odoslali odkaz na obnovenie hesla",
          action: <CheckCircle className="h-4 w-4" />
        });
      } else {
        // Skontroluj či ide o technickú chybu alebo bezpečnostnú odpoveď
        const isTechnicalError = result.message && (
          result.message.includes('Chyba pri odosielaní emailu') ||
          result.message.includes('ERPNext server chyba') ||
          result.message.includes('Služba obnovenia hesla je dočasne nedostupná')
        );
        
        if (isTechnicalError) {
          // Technická chyba - zobraz používateľovi
          toast({
            title: "Chyba odosielania",
            description: result.message,
            variant: "destructive",
            action: <AlertCircle className="h-4 w-4" />
          });
        } else {
          // Bezpečnostná odpoveď - neodhaľuj existenciu účtu
          setIsSuccess(true);
          toast({
            title: "Email odoslaný",
            description: "Ak účet existuje, na váš email sme odoslali odkaz na obnovenie hesla",
            action: <CheckCircle className="h-4 w-4" />
          });
        }
      }
    } catch (error) {
      console.error('Password reset request error:', error);
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

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card className="shadow-lg">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900 rounded-full w-fit">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl font-serif text-foreground">
                  Email odoslaný
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Ak účet s emailom <strong>{email}</strong> existuje, na váš email sme odoslali odkaz na obnovenie hesla.
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Čo robiť ďalej?
                      </h4>
                      <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                        <p>1. Skontrolujte si emailovú schránku</p>
                        <p>2. Kliknite na odkaz v emaili</p>
                        <p>3. Zadajte nové heslo</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-4 space-y-3">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/prihlasenie">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Späť na prihlásenie
                    </Link>
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      setIsSuccess(false);
                      setEmail('');
                    }} 
                    variant="ghost" 
                    size="sm"
                    className="text-sm"
                    data-testid="button-try-again"
                  >
                    Skúsiť znovu s iným emailom
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif text-foreground">
                Zabudnuté heslo
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Zadajte svoj email a pošleme vám odkaz na obnovenie hesla
              </p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Emailová adresa *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vasa@email.com"
                    required
                    data-testid="input-email"
                  />
                  <p className="text-xs text-muted-foreground">
                    Zadajte email, ktorý ste použili pri registrácii
                  </p>
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={isLoading}
                    data-testid="button-submit"
                  >
                    {isLoading ? 'Odosielam...' : 'Odoslať odkaz'}
                  </Button>
                </div>

                <div className="text-center pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Pamätáte si heslo?{' '}
                    <Link href="/prihlasenie" className="text-primary hover:underline font-medium">
                      Prihlásiť sa
                    </Link>
                  </p>
                  
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