import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  email: string;
  firstName: string;
  lastName: string;
  mobile?: string;
}

interface ProfileProps {
  user?: { email: string; name: string } | null;
}

export default function Profile({ user }: ProfileProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({
    email: '',
    firstName: '',
    lastName: '',
    mobile: ''
  });

  const [editData, setEditData] = useState<ProfileData>({
    email: '',
    firstName: '',
    lastName: '',
    mobile: ''
  });

  // Presmeruj ak nie je prihlásený
  useEffect(() => {
    if (!user) {
      toast({
        title: "Neautorizovaný prístup",
        description: "Pre prístup k profilu sa musíte prihlásiť",
        variant: "destructive"
      });
      setLocation('/prihlasenie');
      return;
    }

    // Načítaj údaje profilu
    loadProfileData();
  }, [user, toast, setLocation]);

  const loadProfileData = async () => {
    try {
      // Pre teraz použijem existujúce user údaje a pokúsim sa načítať z API
      if (user) {
        const response = await fetch(`/api/profile?email=${encodeURIComponent(user.email)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          setProfileData(result.data);
          setEditData(result.data);
        } else {
          // Fallback na existujúce user údaje
          const nameParts = user.name.split(' ');
          const fallbackData = {
            email: user.email,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            mobile: ''
          };
          setProfileData(fallbackData);
          setEditData(fallbackData);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Fallback na existujúce user údaje
      if (user) {
        const nameParts = user.name.split(' ');
        const fallbackData = {
          email: user.email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          mobile: ''
        };
        setProfileData(fallbackData);
        setEditData(fallbackData);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleStartEdit = () => {
    setEditData({ ...profileData });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditData({ ...profileData });
    setIsEditing(false);
  };

  const handleSave = async () => {
    // Validácia
    if (!editData.firstName || !editData.lastName || !editData.email) {
      toast({
        title: "Chyba validácie",
        description: "Meno, priezvisko a email sú povinné polia",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      if (!user) return;
      
      const response = await fetch(`/api/profile?email=${encodeURIComponent(user.email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });

      const result = await response.json();

      if (result.success) {
        setProfileData(editData);
        setIsEditing(false);
        toast({
          title: "Profil aktualizovaný",
          description: "Vaše údaje boli úspešne uložené"
        });
      } else {
        toast({
          title: "Chyba pri ukladaní",
          description: result.message || "Nepodarilo sa uložiť zmeny",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Chyba spojenia",
        description: "Nepodarilo sa spojiť so serverom",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Načítavam profil...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-playfair text-foreground">
                      Môj profil
                    </CardTitle>
                    <p className="text-muted-foreground mt-1">
                      Spravujte svoje osobné údaje
                    </p>
                  </div>
                </div>
                
                {!isEditing && (
                  <Button
                    variant="outline"
                    onClick={handleStartEdit}
                    className="flex items-center gap-2"
                    data-testid="button-edit-profile"
                  >
                    <Edit className="h-4 w-4" />
                    Upraviť
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      Meno *
                    </Label>
                    {isEditing ? (
                      <Input
                        id="firstName"
                        value={editData.firstName}
                        onChange={(e) => handleEditChange('firstName', e.target.value)}
                        placeholder="Vaše meno"
                        data-testid="input-firstName"
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-md" data-testid="text-firstName">
                        {profileData.firstName || '-'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Priezvisko *
                    </Label>
                    {isEditing ? (
                      <Input
                        id="lastName"
                        value={editData.lastName}
                        onChange={(e) => handleEditChange('lastName', e.target.value)}
                        placeholder="Vaše priezvisko"
                        data-testid="input-lastName"
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-md" data-testid="text-lastName">
                        {profileData.lastName || '-'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email *
                  </Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editData.email}
                      onChange={(e) => handleEditChange('email', e.target.value)}
                      placeholder="vas@email.com"
                      data-testid="input-email"
                    />
                  ) : (
                    <div className="p-3 bg-muted/50 rounded-md" data-testid="text-email">
                      {profileData.email || '-'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefónne číslo
                  </Label>
                  {isEditing ? (
                    <Input
                      id="mobile"
                      type="tel"
                      value={editData.mobile}
                      onChange={(e) => handleEditChange('mobile', e.target.value)}
                      placeholder="+421 123 456 789"
                      data-testid="input-mobile"
                    />
                  ) : (
                    <div className="p-3 bg-muted/50 rounded-md" data-testid="text-mobile">
                      {profileData.mobile || '-'}
                    </div>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                    data-testid="button-save-profile"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Ukladám...' : 'Uložiť'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                    data-testid="button-cancel-edit"
                  >
                    <X className="h-4 w-4" />
                    Zrušiť
                  </Button>
                </div>
              )}

              <div className="text-sm text-muted-foreground pt-4 border-t border-border">
                <p>* Povinné polia</p>
                <p className="mt-1">
                  Vaše údaje sú chránené a používané iba pre účely spracovania objednávok.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}