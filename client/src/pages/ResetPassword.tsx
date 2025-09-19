import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [urlParams, setUrlParams] = useState<{token?: string; key?: string; user?: string} | null>(null);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // Načítaj query parametre z URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    const key = searchParams.get('key');
    const user = searchParams.get('user');
    
    // Podporujeme nový token-based flow aj starý key/user flow
    if (token) {
      // Nový ERPNext token-based flow
      setUrlParams({ token });
    } else if (key && user) {
      // Starý flow s key a user
      setUrlParams({ key, user });
    } else {
      toast({
        title: "Neplatný odkaz",
        description: "Odkaz pre zmenu hesla nie je platný alebo vypršal",
        variant: "destructive",
        action: <AlertCircle className="h-4 w-4" />
      });
      setLocation('/prihlasenie');
      return;
    }
  }, [toast, setLocation]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!urlParams) {
      toast({
        title: "Chyba",
        description: "Chýbajú údaje pre zmenu hesla",
        variant: "destructive"
      });
      return;
    }

    // Základná validácia
    if (!formData.newPassword || !formData.confirmPassword) {
      toast({
        title: "Chyba validácie",
        description: "Prosím vyplňte oba polia pre heslo",
        variant: "destructive"
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Heslá sa nezhodujú",
        description: "Nové heslo a potvrdenie hesla sa musia zhodovať",
        variant: "destructive"
      });
      return;
    }

    if (formData.newPassword.length < 8) {
      toast({
        title: "Slabé heslo",
        description: "Heslo musí mať aspoň 8 znakov",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      let response;
      
      if (urlParams.token) {
        // Nový ERPNext token-based flow
        console.log('Calling token-based password reset API');
        response = await fetch('/api/update-password-frontend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: urlParams.token,
            new_password: formData.newPassword
          })
        });
      } else {
        // Starý flow s key a user
        console.log('Calling legacy password reset API');
        response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            key: urlParams.key,
            user: urlParams.user,
            newPassword: formData.newPassword
          })
        });
      }

      console.log('Password reset API response status:', response.status);

      let result;
      try {
        result = await response.json();
        console.log('Password reset API result:', result);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error('Neplatná odpoveď zo servera');
      }

      if (response.ok && result.success) {
        toast({
          title: "Heslo zmenené",
          description: "Vaše heslo bolo úspešne zmenené. Môžete sa prihlásiť.",
          action: <CheckCircle className="h-4 w-4" />
        });
        
        // Presmeruj na prihlásenie po krátkom čase
        setTimeout(() => {
          setLocation('/prihlasenie');
        }, 2000);
      } else {
        // Zobraz chybovú správu z servera alebo všeobecnú chybu
        const errorMessage = result.message || 
          (response.status === 400 ? "Neplatné údaje pre zmenu hesla" :
           response.status === 404 ? "Odkaz na zmenu hesla je neplatný alebo vypršal" :
           response.status >= 500 ? "Chyba servera. Skúste to neskôr." :
           "Nastala chyba pri zmene hesla");

        toast({
          title: "Zmena hesla neúspešná",
          description: errorMessage,
          variant: "destructive",
          action: <AlertCircle className="h-4 w-4" />
        });
      }
    } catch (error) {
      console.error('Password reset error:', error);
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

  // Ak nemáme URL parametre, nezobrazíme nič (alebo loading)
  if (!urlParams) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Načítavam...</p>
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
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-playfair text-foreground">
                Zmena hesla
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Zadajte nové heslo pre váš účet
              </p>
              {urlParams.user && (
                <p className="text-sm text-muted-foreground/80 mt-1">
                  {urlParams.user}
                </p>
              )}
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">
                    Nové heslo *
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.newPassword}
                      onChange={(e) => handleInputChange('newPassword', e.target.value)}
                      placeholder="Zadajte nové heslo"
                      className="pr-10"
                      required
                      data-testid="input-newPassword"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Zopakovať heslo *
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Zopakujte nové heslo"
                      className="pr-10"
                      required
                      data-testid="input-confirmPassword"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="button-toggle-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={isLoading}
                    data-testid="button-reset-password"
                  >
                    {isLoading ? 'Mením heslo...' : 'Odoslať'}
                  </Button>
                </div>

                <div className="text-center pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Pamätáte si heslo?{' '}
                    <Link href="/prihlasenie" className="text-primary hover:underline font-medium">
                      Prihlásiť sa
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