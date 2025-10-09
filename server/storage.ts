import { type Product, type Order, type CartItem, type GalleryImage, type InsertGalleryImage, type UpdateGalleryImage } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private carts: Map<string, CartItem[]>;
  private orders: Map<string, Order>;
  private galleryImages: Map<string, GalleryImage>;

  constructor() {
    this.carts = new Map();
    this.orders = new Map();
    this.galleryImages = new Map();
    
    // Add demo gallery images
    this.initializeDemoImages();
  }

  private initializeDemoImages() {
    const demoImages: GalleryImage[] = [
      {
        id: 'demo-1',
        title: 'Naša cukráreň',
        description: 'Krásna cukráreň s útulným interiérom a čerstvými výrobkami',
        imageUrl: '/assets/Elegant_pastry_shop_interior_new-CLgVR26R.png',
        category: 'prevadzka',
        uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        uploadedBy: 'admin@marselabakery.sk',
        isPublic: true
      },
      {
        id: 'demo-2',
        title: 'Čokoládové éclairs',
        description: 'Čerstvé éclairs s belgickou čokoládou a smotanou',
        imageUrl: '/assets/Chocolate_éclair_product_e07f4a3d.png',
        category: 'produkty',
        uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        uploadedBy: 'admin@marselabakery.sk',
        isPublic: true
      },
      {
        id: 'demo-3',
        title: 'Zlatý croissant',
        description: 'Voňavý máslový croissant s krištáľovou kôrkou',
        imageUrl: '/assets/Golden_butter_croissant_3113f28f.png',
        category: 'produkty',
        uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        uploadedBy: 'admin@marselabakery.sk',
        isPublic: true
      },
      {
        id: 'demo-4',
        title: 'Pastelové macarons',
        description: 'Delikátne macarons v pastelových farbách s ovocnou náplňou',
        imageUrl: '/assets/Pastel_colored_macarons_d19a6f3c.png',
        category: 'produkty',
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        uploadedBy: 'admin@marselabakery.sk',
        isPublic: true
      },
      {
        id: 'demo-5',
        title: 'Jahodový koláč',
        description: 'Čerstvý ovocný koláč s jahodami a vanilkovým krémom',
        imageUrl: '/assets/Strawberry_fruit_tart_25e81086.png',
        category: 'produkty',
        uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        uploadedBy: 'admin@marselabakery.sk',
        isPublic: true
      },
      {
        id: 'demo-6',
        title: 'Vystavenie v cukrárni',
        description: 'Vitrína plná čerstvých cukrárenských výrobkov',
        imageUrl: '/assets/Bakery_display_case_hero_a86779fc.png',
        category: 'prevadzka',
        uploadedAt: new Date().toISOString(), // today
        uploadedBy: 'admin@marselabakery.sk',
        isPublic: true
      }
    ];

    demoImages.forEach(image => {
      this.galleryImages.set(image.id, image);
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
}

export const storage = new MemStorage();
