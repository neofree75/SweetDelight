import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
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