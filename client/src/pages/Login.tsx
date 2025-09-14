import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { LogIn, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
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

      const result = await response.json();

      if (result.success && result.user) {
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
        toast({
          title: "Prihlásenie neúspešné",
          description: result.message || "Neplatné prihlasovacie údaje",
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