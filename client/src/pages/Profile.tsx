import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Edit, Save, X, MapPin, Building, Calendar, Globe, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  // Základné údaje
  customerId?: string;
  customerName?: string;
  firstName: string;
  lastName: string;
  email: string;
  salutation?: string;
  gender?: string;
  language?: string;
  
  // Kontaktné údaje  
  mobile?: string;
  fax?: string;
  website?: string;
  
  // Adresa
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  
  // Biznis informácie
  customerGroup?: string;
  territory?: string;
  company?: string;
  customerType?: string;
  taxId?: string;
  
  // Systémové údaje
  disabled?: boolean;
  created?: string;
  modified?: string;
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
    mobile: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
    salutation: '',
    gender: '',

    website: '',
    taxId: ''
  });

  const [editData, setEditData] = useState<ProfileData>({
    email: '',
    firstName: '',
    lastName: '',
    mobile: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
    salutation: '',
    gender: '',

    website: '',
    taxId: ''
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
            mobile: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            state: '',
            pincode: '',
            country: '',
            salutation: '',
            gender: '',
        
            website: '',
            taxId: ''
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
          mobile: '',
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          pincode: '',
          country: '',
          salutation: '',
          gender: '',
      
          website: '',
          taxId: ''
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
            
            <CardContent className="space-y-8">
              {/* Základné informácie */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Základné informácie
                </h3>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salutation" className="text-sm font-medium">
                        Oslovenie
                      </Label>
                      {isEditing ? (
                        <Input
                          id="salutation"
                          value={editData.salutation || ''}
                          onChange={(e) => handleEditChange('salutation', e.target.value)}
                          placeholder="Pán/Pani"
                          data-testid="input-salutation"
                        />
                      ) : (
                        <div className="p-3 bg-muted/50 rounded-md" data-testid="text-salutation">
                          {profileData.salutation || '-'}
                        </div>
                      )}
                    </div>

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
                    <Label htmlFor="gender" className="text-sm font-medium">
                      Pohlavie
                    </Label>
                    {isEditing ? (
                      <Input
                        id="gender"
                        value={editData.gender || ''}
                        onChange={(e) => handleEditChange('gender', e.target.value)}
                        placeholder="Muž/Žena"
                        data-testid="input-gender"
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-md" data-testid="text-gender">
                        {profileData.gender || '-'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Kontaktné informácie */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Kontaktné informácie
                </h3>
                <div className="grid gap-4">
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
                      Mobilný telefón
                    </Label>
                    {isEditing ? (
                      <Input
                        id="mobile"
                        type="tel"
                        value={editData.mobile || ''}
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

                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Webstránka
                    </Label>
                    {isEditing ? (
                      <Input
                        id="website"
                        type="url"
                        value={editData.website || ''}
                        onChange={(e) => handleEditChange('website', e.target.value)}
                        placeholder="https://www.example.com"
                        data-testid="input-website"
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-md" data-testid="text-website">
                        {profileData.website || '-'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Adresa */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Adresa
                </h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addressLine1" className="text-sm font-medium">
                      Adresa 1
                    </Label>
                    {isEditing ? (
                      <Input
                        id="addressLine1"
                        value={editData.addressLine1 || ''}
                        onChange={(e) => handleEditChange('addressLine1', e.target.value)}
                        placeholder="Ulica a číslo"
                        data-testid="input-addressLine1"
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-md" data-testid="text-addressLine1">
                        {profileData.addressLine1 || '-'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressLine2" className="text-sm font-medium">
                      Adresa 2
                    </Label>
                    {isEditing ? (
                      <Input
                        id="addressLine2"
                        value={editData.addressLine2 || ''}
                        onChange={(e) => handleEditChange('addressLine2', e.target.value)}
                        placeholder="Ďalšie informácie"
                        data-testid="input-addressLine2"
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-md" data-testid="text-addressLine2">
                        {profileData.addressLine2 || '-'}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm font-medium">
                        Mesto
                      </Label>
                      {isEditing ? (
                        <Input
                          id="city"
                          value={editData.city || ''}
                          onChange={(e) => handleEditChange('city', e.target.value)}
                          placeholder="Bratislava"
                          data-testid="input-city"
                        />
                      ) : (
                        <div className="p-3 bg-muted/50 rounded-md" data-testid="text-city">
                          {profileData.city || '-'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pincode" className="text-sm font-medium">
                        PSČ
                      </Label>
                      {isEditing ? (
                        <Input
                          id="pincode"
                          value={editData.pincode || ''}
                          onChange={(e) => handleEditChange('pincode', e.target.value)}
                          placeholder="12345"
                          data-testid="input-pincode"
                        />
                      ) : (
                        <div className="p-3 bg-muted/50 rounded-md" data-testid="text-pincode">
                          {profileData.pincode || '-'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-sm font-medium">
                        Krajina
                      </Label>
                      {isEditing ? (
                        <Input
                          id="country"
                          value={editData.country || ''}
                          onChange={(e) => handleEditChange('country', e.target.value)}
                          placeholder="Slovensko"
                          data-testid="input-country"
                        />
                      ) : (
                        <div className="p-3 bg-muted/50 rounded-md" data-testid="text-country">
                          {profileData.country || '-'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Biznis informácie */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Biznis informácie
                </h3>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerGroup" className="text-sm font-medium">
                        Skupina zákazníka
                      </Label>
                      <div className="p-3 bg-muted/50 rounded-md" data-testid="text-customerGroup">
                        {profileData.customerGroup || '-'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerType" className="text-sm font-medium">
                        Typ zákazníka
                      </Label>
                      <div className="p-3 bg-muted/50 rounded-md" data-testid="text-customerType">
                        {profileData.customerType || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId" className="text-sm font-medium flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      DIČ
                    </Label>
                    {isEditing ? (
                      <Input
                        id="taxId"
                        value={editData.taxId || ''}
                        onChange={(e) => handleEditChange('taxId', e.target.value)}
                        placeholder="SK1234567890"
                        data-testid="input-taxId"
                      />
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-md" data-testid="text-taxId">
                        {profileData.taxId || '-'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Systémové informácie */}
              {(profileData.created || profileData.modified) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Systémové informácie</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profileData.created && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Vytvorené</Label>
                        <div className="p-3 bg-muted/50 rounded-md" data-testid="text-created">
                          {new Date(profileData.created).toLocaleString('sk-SK')}
                        </div>
                      </div>
                    )}

                    {profileData.modified && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Posledná úprava</Label>
                        <div className="p-3 bg-muted/50 rounded-md" data-testid="text-modified">
                          {new Date(profileData.modified).toLocaleString('sk-SK')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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