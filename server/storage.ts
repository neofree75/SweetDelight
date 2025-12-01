import { type Product, type Order, type CartItem, type GalleryImage, type InsertGalleryImage, type UpdateGalleryImage, type GalleryCategory, type InsertGalleryCategory, type UpdateGalleryCategory } from "@shared/schema";
import { randomUUID } from "crypto";

// Since we're using ERPNext as the primary data store,
// this storage interface is mainly for session/cart management
// and temporary order processing before sending to ERPNext

export interface IStorage {
  // Cart management (session-based)
  getCartItems(sessionId: string): Promise<CartItem[]>;
  updateCartItems(sessionId: string, items: CartItem[]): Promise<void>;
  clearCart(sessionId: string): Promise<void>;
  
  // Order tracking (before ERPNext sync)
  createTempOrder(order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order>;
  getTempOrder(orderId: string): Promise<Order | undefined>;
  updateOrderStatus(orderId: string, status: Order['status']): Promise<void>;
  
  // Gallery management
  getGalleryImages(): Promise<GalleryImage[]>;
  getGalleryImage(id: string): Promise<GalleryImage | undefined>;
  createGalleryImage(imageData: InsertGalleryImage, imageUrl: string): Promise<GalleryImage>;
  updateGalleryImage(id: string, updates: UpdateGalleryImage): Promise<GalleryImage | undefined>;
  deleteGalleryImage(id: string): Promise<boolean>;
  
  // Gallery categories management
  getGalleryCategories(): Promise<GalleryCategory[]>;
  getGalleryCategory(id: string): Promise<GalleryCategory | undefined>;
  getGalleryCategoryByName(name: string): Promise<GalleryCategory | undefined>;
  createGalleryCategory(categoryData: InsertGalleryCategory): Promise<GalleryCategory>;
  updateGalleryCategory(id: string, updates: UpdateGalleryCategory): Promise<GalleryCategory | undefined>;
  deleteGalleryCategory(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private carts: Map<string, CartItem[]>;
  private orders: Map<string, Order>;
  private galleryImages: Map<string, GalleryImage>;
  private galleryCategories: Map<string, GalleryCategory>;

  constructor() {
    this.carts = new Map();
    this.orders = new Map();
    this.galleryImages = new Map();
    this.galleryCategories = new Map();
    
    // Initialize default categories
    this.initializeDefaultCategories();
  }

  private initializeDefaultCategories() {
    const defaultCategories = [
      { name: 'prevadzka', label: 'Prevádzka', isDefault: true },
      { name: 'produkty', label: 'Produkty', isDefault: true },
      { name: 'udalosti', label: 'Udalosti', isDefault: true },
      { name: 'timy', label: 'Tím', isDefault: true }
    ];

    defaultCategories.forEach(cat => {
      const id = cat.name; // Use name as ID for default categories
      const category: GalleryCategory = {
        id,
        name: cat.name,
        label: cat.label,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        isDefault: cat.isDefault
      };
      this.galleryCategories.set(id, category);
    });
  }


  async getCartItems(sessionId: string): Promise<CartItem[]> {
    return this.carts.get(sessionId) || [];
  }

  async updateCartItems(sessionId: string, items: CartItem[]): Promise<void> {
    this.carts.set(sessionId, items);
  }

  async clearCart(sessionId: string): Promise<void> {
    this.carts.delete(sessionId);
  }

  async createTempOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...orderData,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.orders.set(id, order);
    return order;
  }

  async getTempOrder(orderId: string): Promise<Order | undefined> {
    return this.orders.get(orderId);
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = status;
      this.orders.set(orderId, order);
    }
  }

  // Gallery management methods
  async getGalleryImages(): Promise<GalleryImage[]> {
    return Array.from(this.galleryImages.values()).sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async getGalleryImage(id: string): Promise<GalleryImage | undefined> {
    return this.galleryImages.get(id);
  }

  async createGalleryImage(imageData: InsertGalleryImage, imageUrl: string): Promise<GalleryImage> {
    const id = randomUUID();
    const galleryImage: GalleryImage = {
      id,
      title: imageData.title,
      description: imageData.description,
      imageUrl,
      category: imageData.category,
      uploadedAt: new Date().toISOString(),
      uploadedBy: imageData.uploadedBy,
      isPublic: imageData.isPublic
    };
    this.galleryImages.set(id, galleryImage);
    return galleryImage;
  }

  async updateGalleryImage(id: string, updates: UpdateGalleryImage): Promise<GalleryImage | undefined> {
    const existingImage = this.galleryImages.get(id);
    if (!existingImage) {
      return undefined;
    }

    const updatedImage: GalleryImage = {
      ...existingImage,
      ...updates
    };
    this.galleryImages.set(id, updatedImage);
    return updatedImage;
  }

  async deleteGalleryImage(id: string): Promise<boolean> {
    return this.galleryImages.delete(id);
  }

  // Gallery categories management methods
  async getGalleryCategories(): Promise<GalleryCategory[]> {
    return Array.from(this.galleryCategories.values()).sort((a, b) => {
      // Default categories first, then by name
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      return a.label.localeCompare(b.label);
    });
  }

  async getGalleryCategory(id: string): Promise<GalleryCategory | undefined> {
    return this.galleryCategories.get(id);
  }

  async getGalleryCategoryByName(name: string): Promise<GalleryCategory | undefined> {
    return Array.from(this.galleryCategories.values()).find(cat => cat.name === name);
  }

  async createGalleryCategory(categoryData: InsertGalleryCategory): Promise<GalleryCategory> {
    const id = randomUUID();
    const category: GalleryCategory = {
      id,
      name: categoryData.name,
      label: categoryData.label,
      createdAt: new Date().toISOString(),
      createdBy: categoryData.createdBy,
      isDefault: categoryData.isDefault || false
    };
    this.galleryCategories.set(id, category);
    return category;
  }

  async updateGalleryCategory(id: string, updates: UpdateGalleryCategory): Promise<GalleryCategory | undefined> {
    const existingCategory = this.galleryCategories.get(id);
    if (!existingCategory) {
      return undefined;
    }

    // Prevent deletion of default categories
    if (existingCategory.isDefault && updates.name && updates.name !== existingCategory.name) {
      throw new Error('Cannot modify default category name');
    }

    const updatedCategory: GalleryCategory = {
      ...existingCategory,
      ...updates
    };
    this.galleryCategories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteGalleryCategory(id: string): Promise<boolean> {
    const category = this.galleryCategories.get(id);
    if (!category) {
      return false;
    }

    // Prevent deletion of default categories
    if (category.isDefault) {
      throw new Error('Cannot delete default category');
    }

    // Check if any images use this category
    const imagesUsingCategory = Array.from(this.galleryImages.values()).some(
      img => img.category === id || img.category === category.name
    );

    if (imagesUsingCategory) {
      throw new Error('Cannot delete category that is used by images');
    }

    return this.galleryCategories.delete(id);
  }
}

export const storage = new MemStorage();
