import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  X, 
  Edit, 
  Trash2, 
  Eye, 
  Plus, 
  Search,
  Calendar,
  User,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GalleryImage {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category: string;
  uploadedAt: string;
  uploadedBy: string;
  isPublic: boolean;
}

interface User {
  email: string;
  name: string;
  isAdmin?: boolean;
}

interface GalleryProps {
  user?: User | null;
}

export default function Gallery({ user }: GalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'prevadzka',
    image: null as File | null
  });
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: 'prevadzka',
    image: null as File | null
  });
  const { toast } = useToast();

  const categories = [
    { value: 'all', label: 'Všetky' },
    { value: 'prevadzka', label: 'Prevádzka' },
    { value: 'produkty', label: 'Produkty' },
    { value: 'udalosti', label: 'Udalosti' },
    { value: 'timy', label: 'Tím' }
  ];

  // Načítanie obrázkov
  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gallery');
      
      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Server returned non-JSON response:', contentType);
        toast({
          title: "Chyba",
          description: "Server neodpovedá správne. Skontrolujte, či je server spustený.",
          variant: "destructive"
        });
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        toast({
          title: "Chyba",
          description: `Nepodarilo sa načítať fotogalériu (${response.status})`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať fotogalériu. Skontrolujte pripojenie k serveru.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrovanie obrázkov
  const filteredImages = images.filter(image => {
    const matchesSearch = image.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (image.description && image.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || image.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Upload obrázka
  const handleUpload = async () => {
    if (!uploadForm.title) {
      toast({
        title: "Chyba",
        description: "Vyplňte názov obrázka",
        variant: "destructive"
      });
      return;
    }

    if (!uploadForm.image) {
      toast({
        title: "Chyba",
        description: "Vyberte obrázok na nahratie",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', uploadForm.image);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description || '');
      formData.append('category', uploadForm.category);

      const response = await fetch('/api/gallery', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Úspech",
          description: "Obrázok bol úspešne pridaný do galérie"
        });
        setIsUploadDialogOpen(false);
        setUploadForm({ title: '', description: '', category: 'prevadzka', image: null });
        loadImages();
      } else {
        const error = await response.json();
        toast({
          title: "Chyba",
          description: error.error || "Nepodarilo sa pridať obrázok",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa pridať obrázok. Skontrolujte pripojenie k serveru.",
        variant: "destructive"
      });
    }
  };

  // Úprava obrázka
  const handleEdit = async () => {
    if (!editingImage || !editForm.title) {
      toast({
        title: "Chyba",
        description: "Vyplňte názov",
        variant: "destructive"
      });
      return;
    }

    try {
      let response;
      
      if (editForm.image) {
        // If new image is selected, use FormData for file upload
        const formData = new FormData();
        formData.append('image', editForm.image);
        formData.append('title', editForm.title);
        formData.append('description', editForm.description || '');
        formData.append('category', editForm.category);

        response = await fetch(`/api/gallery/${editingImage.id}`, {
          method: 'PUT',
          body: formData,
          credentials: 'include'
        });
      } else {
        // If no new image, just update metadata
        response = await fetch(`/api/gallery/${editingImage.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: editForm.title,
            description: editForm.description,
            category: editForm.category
          }),
          credentials: 'include'
        });
      }

      if (response.ok) {
        toast({
          title: "Úspech",
          description: "Obrázok bol úspešne upravený"
        });
        setIsEditDialogOpen(false);
        setEditingImage(null);
        loadImages();
      } else {
        const error = await response.json();
        toast({
          title: "Chyba",
          description: error.message || "Nepodarilo sa upraviť obrázok",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error editing image:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa upraviť obrázok",
        variant: "destructive"
      });
    }
  };

  // Vymazanie obrázka
  const handleDelete = async (imageId: string) => {
    try {
      const response = await fetch(`/api/gallery/${imageId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Úspech",
          description: "Obrázok bol úspešne vymazaný"
        });
        loadImages();
      } else {
        const error = await response.json();
        toast({
          title: "Chyba",
          description: error.message || "Nepodarilo sa vymazať obrázok",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vymazať obrázok",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (image: GalleryImage) => {
    setEditingImage(image);
    setEditForm({
      title: image.title,
      description: image.description || '',
      category: image.category,
      image: null // Reset image file
    });
    setIsEditDialogOpen(true);
  };

  // Navigation functions for image detail
  const goToPreviousImage = () => {
    if (!selectedImage) return;
    const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
    if (currentIndex > 0) {
      setSelectedImage(filteredImages[currentIndex - 1]);
    }
  };

  const goToNextImage = () => {
    if (!selectedImage) return;
    const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
    if (currentIndex < filteredImages.length - 1) {
      setSelectedImage(filteredImages[currentIndex + 1]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Načítavam fotogalériu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Fotogaléria
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Pozrite si naše krásne cukrárske výrobky a prevádzku
          </p>
        </div>

        {/* Admin Controls */}
        {user?.isAdmin && (
          <div className="flex flex-col items-center mb-8">
            <Badge variant="secondary" className="mb-4">
              <User className="h-3 w-3 mr-1" />
              System User (Admin)
            </Badge>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4" />
                  Pridať obrázok
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Pridať nový obrázok</DialogTitle>
                  <DialogDescription>
                    Pridajte nový obrázok do fotogalérie cukrárne.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Názov *</label>
                    <Input
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      placeholder="Názov obrázka"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Popis</label>
                    <Textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder="Popis obrázka"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Kategória</label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      {categories.slice(1).map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Obrázok *</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadForm({ ...uploadForm, image: file });
                        }
                      }}
                      className="mt-1 border-2 border-blue-500 bg-blue-50 hover:bg-blue-100 focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Povolené formáty: JPG, PNG, GIF. Maximálna veľkosť: 5MB
                    </p>
                  </div>
                  <Button onClick={handleUpload} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Nahrať obrázok
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Hľadať v galérii..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map(category => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.value)}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        {filteredImages.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Žiadne obrázky
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Nenašli sa žiadne obrázky zodpovedajúce filtrom'
                : 'Galéria je zatiaľ prázdna'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredImages.map((image) => (
              <Card key={image.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={image.imageUrl}
                      alt={image.title}
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => setSelectedImage(image)}
                    />
                    {user?.isAdmin && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditDialog(image)}
                            title="Upraviť obrázok"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 w-8 p-0"
                                title="Vymazať obrázok"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Vymazať obrázok</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Naozaj chcete vymazať obrázok "{image.title}"? Táto akcia sa nedá vrátiť späť.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrušiť</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(image.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Vymazať
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-lg mb-2 line-clamp-2">{image.title}</h3>
                    {image.description && (
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {image.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(image.uploadedAt)}
                      </div>
                      <Badge variant="secondary">
                        {categories.find(c => c.value === image.category)?.label || image.category}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Image Preview Modal */}
        {selectedImage && (
          <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
            <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedImage.title}</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {filteredImages.findIndex(img => img.id === selectedImage.id) + 1} / {filteredImages.length}
                    </span>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  {selectedImage.description || 'Obrázok z fotogalérie'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="relative w-full grid grid-cols-[auto_1fr_auto] items-center gap-4">
                {/* Left arrow */}
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white/90 hover:bg-white border-2 shadow-lg justify-self-start"
                  onClick={goToPreviousImage}
                  disabled={filteredImages.findIndex(img => img.id === selectedImage.id) === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Image container */}
                <div className="flex justify-center">
                  <img
                    src={selectedImage.imageUrl}
                    alt={selectedImage.title}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                </div>

                {/* Right arrow */}
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white/90 hover:bg-white border-2 shadow-lg justify-self-end"
                  onClick={goToNextImage}
                  disabled={filteredImages.findIndex(img => img.id === selectedImage.id) === filteredImages.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Image info */}
              <div className="space-y-2">
                {selectedImage.description && (
                  <p className="text-muted-foreground">{selectedImage.description}</p>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedImage.uploadedAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {selectedImage.uploadedBy}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upraviť obrázok</DialogTitle>
              <DialogDescription>
                Upravte informácie o obrázku v galérii.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Názov *</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Názov obrázka"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Popis</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Popis obrázka"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kategória</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  {categories.slice(1).map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Nový obrázok (voliteľné)</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditForm({ ...editForm, image: file });
                    }
                  }}
                  className="mt-1 border-2 border-blue-500 bg-blue-50 hover:bg-blue-100 focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Povolené formáty: JPG, PNG, GIF. Maximálna veľkosť: 5MB
                </p>
                {editingImage && (
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">Aktuálny obrázok:</p>
                    <img 
                      src={editingImage.imageUrl} 
                      alt={editingImage.title}
                      className="w-20 h-20 object-cover rounded mt-1"
                    />
                  </div>
                )}
              </div>
              <Button onClick={handleEdit} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Uložiť zmeny
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
