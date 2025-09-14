import { type Product, type Order, type CartItem } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private carts: Map<string, CartItem[]>;
  private orders: Map<string, Order>;

  constructor() {
    this.carts = new Map();
    this.orders = new Map();
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
}

export const storage = new MemStorage();
