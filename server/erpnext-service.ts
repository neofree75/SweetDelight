import axios, { AxiosInstance } from 'axios';
import { 
  ERPNextItem, 
  ERPNextPrice, 
  ERPNextCustomer, 
  ERPNextSalesOrder,
  Product 
} from '@shared/schema';

export class ERPNextService {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private productCache: { data: Product[]; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minút

  constructor() {
    this.baseUrl = process.env.ERPNEXT_URL || '';
    this.apiKey = process.env.ERPNEXT_API_KEY || '';
    this.apiSecret = process.env.ERPNEXT_API_SECRET || '';

    // Validácia konfigurčných premenných
    if (!this.baseUrl || !this.apiKey || !this.apiSecret) {
      console.error('ERPNext konfigurácia je neúplná. Skontrolujte premenné prostredia: ERPNEXT_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET, ERPNEXT_COMPANY');
    }

    this.client = axios.create({
      baseURL: `${this.baseUrl}/api`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${this.apiKey}:${this.apiSecret}`
      },
      timeout: 10000
    });
  }

  // Validate ERPNext credentials and configuration
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    // Check if all required environment variables are set
    if (!process.env.ERPNEXT_URL || this.baseUrl === 'https://your-erpnext-instance.com') {
      return {
        valid: false,
        error: 'ERPNEXT_URL environment variable is not set or using default placeholder value'
      };
    }

    if (!process.env.ERPNEXT_API_KEY || this.apiKey === '') {
      return {
        valid: false,
        error: 'ERPNEXT_API_KEY environment variable is not set'
      };
    }

    if (!process.env.ERPNEXT_API_SECRET || this.apiSecret === '') {
      return {
        valid: false,
        error: 'ERPNEXT_API_SECRET environment variable is not set'
      };
    }

    const company = process.env.ERPNEXT_COMPANY;
    if (!company || company === 'Your Company Name') {
      return {
        valid: false,
        error: 'ERPNEXT_COMPANY environment variable is not set or using default placeholder value'
      };
    }

    // Test API connectivity and authentication
    try {
      const response = await this.client.get('/method/frappe.ping');
      if (response.status !== 200) {
        return {
          valid: false,
          error: `ERPNext API returned status ${response.status} instead of 200`
        };
      }

      // Verify company exists
      try {
        const companyResponse = await this.client.get(`/resource/Company?fields=["name"]&filters=[["name","=","${company}"]]`);
        if (!companyResponse.data.data || companyResponse.data.data.length === 0) {
          return {
            valid: false,
            error: `Company "${company}" does not exist in ERPNext`
          };
        }
      } catch (companyError) {
        console.warn('Could not verify company existence:', companyError);
        // Continue without failing - company verification is optional
      }

      return { valid: true };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return {
            valid: false,
            error: 'ERPNext API authentication failed - check ERPNEXT_API_KEY and ERPNEXT_API_SECRET'
          };
        }
        if (error.response?.status === 403) {
          return {
            valid: false,
            error: 'ERPNext API access forbidden - check API key permissions'
          };
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          return {
            valid: false,
            error: `Cannot connect to ERPNext instance at ${this.baseUrl} - check ERPNEXT_URL`
          };
        }
      }
      return {
        valid: false,
        error: `ERPNext connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Get all active items from ERPNext
  async getItems(): Promise<ERPNextItem[]> {
    try {
      const response = await this.client.get('/resource/Item', {
        params: {
          fields: '["name","item_name","description","item_group","stock_uom","is_stock_item","disabled","image"]',
          filters: '[["disabled","=","0"],["is_stock_item","=","1"]]',
          limit_page_length: 100
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching items from ERPNext:', error);
      return [];
    }
  }

  // Get price for specific items
  async getItemPrices(itemCodes: string[]): Promise<ERPNextPrice[]> {
    try {
      const response = await this.client.get('/resource/Item%20Price', {
        params: {
          fields: '["item_code","price_list_rate","currency","price_list"]',
          filters: `[["item_code","in",${JSON.stringify(itemCodes)}],["price_list","=","Standard Selling"]]`,
          limit_page_length: 100
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching item prices from ERPNext:', error);
      return [];
    }
  }

  // Create customer in ERPNext
  async createCustomer(customerData: Omit<ERPNextCustomer, 'name'>): Promise<string | null> {
    try {
      const response = await this.client.post('/resource/Customer', customerData);

      return response.data.data.name;
    } catch (error) {
      console.error('Error creating customer in ERPNext:', error);
      return null;
    }
  }

  // Create sales order in ERPNext
  async createSalesOrder(orderData: ERPNextSalesOrder): Promise<string | null> {
    try {
      const response = await this.client.post('/resource/Sales%20Order', orderData);

      return response.data.data.name;
    } catch (error) {
      console.error('Error creating sales order in ERPNext:', error);
      return null;
    }
  }

  // Transform ERPNext items to frontend product format with caching
  async getProductsForFrontend(): Promise<Product[]> {
    // Skontroluj cache
    if (this.productCache && 
        Date.now() - this.productCache.timestamp < this.CACHE_DURATION) {
      return this.productCache.data;
    }

    const items = await this.getItems();
    
    if (items.length === 0) {
      return [];
    }

    const itemCodes = items.map(item => item.name);
    const prices = await this.getItemPrices(itemCodes);

    // Create a price lookup map
    const priceMap = new Map<string, number>();
    prices.forEach(price => {
      priceMap.set(price.item_code, price.price_list_rate);
    });

    // Transform items to products
    const products = items.map(item => ({
      id: item.name,
      name: item.item_name,
      description: item.description || '',
      price: priceMap.get(item.name) || 0,
      image: item.image || '/placeholder-product.jpg',
      category: item.item_group,
      inStock: !item.disabled
    }));

    // Ulož do cache
    this.productCache = {
      data: products,
      timestamp: Date.now()
    };

    return products;
  }

  // Získaj konkrétny produkt podľa ID
  async getProductById(productId: string): Promise<Product | null> {
    const products = await this.getProductsForFrontend();
    return products.find(p => p.id === productId) || null;
  }

  // Check if ERPNext is accessible
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/method/frappe.ping');
      return response.status === 200;
    } catch (error) {
      console.error('ERPNext health check failed:', error);
      return false;
    }
  }
}

export const erpNextService = new ERPNextService();