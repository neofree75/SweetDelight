import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Phone, Edit, Save, X, MapPin, Building, Calendar, CreditCard } from 'lucide-react';
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
  
  // Adresa
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  
  // Biznis informácie
  territory?: string;
  company?: string;
  taxId?: string;
  customerType?: string;
  ico?: string;
  icDph?: string;
  zapisVOrsr?: string;
  
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
    taxId: '',
    customerType: '',
    ico: '',
    icDph: '',
    zapisVOrsr: ''
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
    taxId: '',
    customerType: '',
    ico: '',
    icDph: '',
    zapisVOrsr: ''
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
            taxId: '',
            customerType: '',
            ico: '',
            icDph: '',
            zapisVOrsr: ''
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
          taxId: '',
          customerType: '',
          ico: '',
          icDph: '',
          zapisVOrsr: ''
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

    // Validácia adresy - ak je vyplnená adresa, mesto je povinné
    if (editData.addressLine1 && !editData.city) {
      toast({
        title: "Chyba validácie",
        description: "Ak vyplníte adresu, pole Mesto je povinné",
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
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Načítavam profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <User className="h-5 w-5" />
                      Môj profil
        </h2>
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
            
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Základné informácie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Základné informácie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Oslovenie:</span>
                      {isEditing ? (
                        <Input
                          value={editData.salutation || ''}
                          onChange={(e) => handleEditChange('salutation', e.target.value)}
                          placeholder="Pán/Pani"
                    className="w-48"
                          data-testid="input-salutation"
                        />
                      ) : (
                  <span className="font-medium">{profileData.salutation || '-'}</span>
                      )}
                    </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Meno:</span>
                      {isEditing ? (
                        <Input
                          value={editData.firstName}
                          onChange={(e) => handleEditChange('firstName', e.target.value)}
                          placeholder="Vaše meno"
                    className="w-48"
                          data-testid="input-firstName"
                        />
                      ) : (
                  <span className="font-medium">{profileData.firstName || '-'}</span>
                      )}
                    </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Priezvisko:</span>
                      {isEditing ? (
                        <Input
                          value={editData.lastName}
                          onChange={(e) => handleEditChange('lastName', e.target.value)}
                          placeholder="Vaše priezvisko"
                    className="w-48"
                          data-testid="input-lastName"
                        />
                      ) : (
                  <span className="font-medium">{profileData.lastName || '-'}</span>
                      )}
                  </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Pohlavie:</span>
                    {isEditing ? (
                      <Input
                        value={editData.gender || ''}
                        onChange={(e) => handleEditChange('gender', e.target.value)}
                        placeholder="Muž/Žena"
                    className="w-48"
                        data-testid="input-gender"
                      />
                    ) : (
                  <span className="font-medium">{profileData.gender || '-'}</span>
                    )}
                  </div>
                </div>
          </CardContent>
        </Card>

              {/* Kontaktné informácie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Kontaktné informácie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={editData.email}
                        onChange={(e) => handleEditChange('email', e.target.value)}
                        placeholder="vas@email.com"
                    className="w-64"
                        data-testid="input-email"
                      />
                    ) : (
                  <span className="font-medium">{profileData.email || '-'}</span>
                    )}
                  </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Mobilný telefón:</span>
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={editData.mobile || ''}
                        onChange={(e) => handleEditChange('mobile', e.target.value)}
                        placeholder="+421 123 456 789"
                    className="w-48"
                        data-testid="input-mobile"
                      />
                    ) : (
                  <span className="font-medium">{profileData.mobile || '-'}</span>
                    )}
              </div>
            </div>
          </CardContent>
        </Card>

              {/* Adresa */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Adresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adresa 1:</span>
                    {isEditing ? (
                      <Input
                        value={editData.addressLine1 || ''}
                        onChange={(e) => handleEditChange('addressLine1', e.target.value)}
                        placeholder="Ulica a číslo"
                    className="w-96"
                        data-testid="input-addressLine1"
                      />
                    ) : (
                  <span className="font-medium">{profileData.addressLine1 || '-'}</span>
                    )}
                  </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Adresa 2:</span>
                    {isEditing ? (
                      <Input
                        value={editData.addressLine2 || ''}
                        onChange={(e) => handleEditChange('addressLine2', e.target.value)}
                        placeholder="Ďalšie informácie"
                    className="w-96"
                        data-testid="input-addressLine2"
                      />
                    ) : (
                  <span className="font-medium">{profileData.addressLine2 || '-'}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mesto:</span>
                      {isEditing ? (
                        <Input
                          value={editData.city || ''}
                          onChange={(e) => handleEditChange('city', e.target.value)}
                          placeholder="Bratislava"
                      className="w-40"
                          data-testid="input-city"
                        />
                      ) : (
                    <span className="font-medium">{profileData.city || '-'}</span>
                      )}
                    </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">PSČ:</span>
                      {isEditing ? (
                        <Input
                          value={editData.pincode || ''}
                          onChange={(e) => handleEditChange('pincode', e.target.value)}
                          placeholder="12345"
                      className="w-32"
                          data-testid="input-pincode"
                        />
                      ) : (
                    <span className="font-medium">{profileData.pincode || '-'}</span>
                      )}
                    </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Krajina:</span>
                      {isEditing ? (
                        <Input
                          value={editData.country || ''}
                          onChange={(e) => handleEditChange('country', e.target.value)}
                          placeholder="Slovensko"
                      className="w-40"
                          data-testid="input-country"
                        />
                      ) : (
                    <span className="font-medium">{profileData.country || '-'}</span>
                      )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

              {/* Biznis informácie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Biznis informácie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">DIČ:</span>
                    {isEditing ? (
                      <Input
                        value={editData.taxId || ''}
                        onChange={(e) => handleEditChange('taxId', e.target.value)}
                        placeholder="12345678"
                    className="w-48"
                        data-testid="input-taxId"
                      />
                    ) : (
                  <span className="font-medium">{profileData.taxId || '-'}</span>
                    )}
                  </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">IČO:</span>
                    {isEditing ? (
                      <Input
                        value={editData.ico || ''}
                        onChange={(e) => handleEditChange('ico', e.target.value)}
                        placeholder="87654321"
                    className="w-48"
                        data-testid="input-ico"
                      />
                    ) : (
                  <span className="font-medium">{profileData.ico || '-'}</span>
                    )}
                  </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">IČ DPH:</span>
                    {isEditing ? (
                      <Input
                        value={editData.icDph || ''}
                        onChange={(e) => handleEditChange('icDph', e.target.value)}
                        placeholder="SK1234567890"
                    className="w-48"
                        data-testid="input-icDph"
                      />
                    ) : (
                  <span className="font-medium">{profileData.icDph || '-'}</span>
                    )}
                  </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Zápis v ORSR:</span>
                    {isEditing ? (
                      <Input
                        value={editData.zapisVOrsr || ''}
                        onChange={(e) => handleEditChange('zapisVOrsr', e.target.value)}
                        placeholder="zapisor"
                    className="w-48"
                        data-testid="input-zapisVOrsr"
                      />
                    ) : (
                  <span className="font-medium">{profileData.zapisVOrsr || '-'}</span>
                    )}
                  </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Typ zákazníka:</span>
                    {isEditing ? (
                      <Select
                        value={editData.customerType || 'Individual'}
                        onValueChange={(value) => handleEditChange('customerType', value)}
                        data-testid="select-customerType"
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Vyberte typ zákazníka" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Individual">Individuálny</SelectItem>
                          <SelectItem value="Company">Spoločnosť</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                  <span className="font-medium">
                          {profileData.customerType === 'Company' ? 'Spoločnosť' : 
                           profileData.customerType === 'Individual' ? 'Individuálny' : 
                           profileData.customerType || '-'}
                        </span>
                    )}
                  </div>
                </div>
          </CardContent>
        </Card>

              {/* Systémové informácie */}
              {(profileData.created || profileData.modified) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Systémové informácie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                    {profileData.created && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vytvorené:</span>
                    <span className="font-medium" data-testid="text-created">
                          {new Date(profileData.created).toLocaleString('sk-SK')}
                    </span>
                      </div>
                    )}

                    {profileData.modified && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posledná úprava:</span>
                    <span className="font-medium" data-testid="text-modified">
                          {new Date(profileData.modified).toLocaleString('sk-SK')}
                    </span>
                      </div>
                    )}
                  </div>
            </CardContent>
          </Card>
        )}
                </div>

      {/* Action Buttons */}
              {isEditing && (
        <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                    data-testid="button-save-profile"
                  >
                    <Save className="h-4 w-4" />
            {isSaving ? 'Ukladám...' : 'Uložiť zmeny'}
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

      {/* Footer Note */}
      <div className="text-sm text-muted-foreground pt-4 border-t">
                <p>* Povinné polia</p>
                <p className="mt-1">
                  Vaše údaje sú chránené a používané iba pre účely spracovania objednávok.
                </p>
              </div>
    </div>
  );
}