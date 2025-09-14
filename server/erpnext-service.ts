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
          fields: '["name","item_name","description","item_group","stock_uom","is_stock_item","disabled","image","valuation_rate"]',
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


    // Transform items to products
    const products = items.map(item => {
      // Oprav image URL - pridaj ERPNext base URL pre obrázky
      let imageUrl = '/placeholder-product.jpg';
      if (item.image && item.image.startsWith('/files/')) {
        imageUrl = `${this.baseUrl}${item.image}`;
      } else if (item.image) {
        imageUrl = item.image;
      }

      return {
        id: item.name,
        name: item.item_name,
        description: item.description || '',
        price: item.valuation_rate || 0,
        image: imageUrl,
        category: item.item_group,
        inStock: !item.disabled
      };
    });

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

  // Register user in ERPNext
  async registerUser(userData: {
    email: string;
    first_name: string;
    last_name: string;
    mobile_no?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.post('/method/external_reset.api.register.register_user', userData);
      
      if (response.data.message && response.data.message.success) {
        return {
          success: true,
          message: 'Registrácia bola úspešná'
        };
      } else if (response.data.message && response.data.message.error) {
        return {
          success: false,
          message: response.data.message.error
        };
      } else {
        return {
          success: true,
          message: 'Registrácia bola úspešná'
        };
      }
    } catch (error) {
      console.error('Error registering user in ERPNext:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
          return {
            success: false,
            message: error.response.data.message
          };
        }
        if (error.response?.data?.exc) {
          // ERPNext often returns detailed error messages in exc field
          const excMessage = error.response.data.exc;
          if (typeof excMessage === 'string' && excMessage.includes('already exists')) {
            return {
              success: false,
              message: 'Používateľ s týmto emailom už existuje'
            };
          }
          return {
            success: false,
            message: 'Chyba pri registrácii používateľa'
          };
        }
        if (error.response?.status === 409) {
          return {
            success: false,
            message: 'Používateľ s týmto emailom už existuje'
          };
        }
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          return {
            success: false,
            message: 'Neplatné údaje pre registráciu'
          };
        }
      }
      
      return {
        success: false,
        message: 'Chyba pri registrácii používateľa'
      };
    }
  }

  // Update user password via ERPNext reset password API
  async updateUserPassword(data: { key: string; user: string; new_password: string }): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Updating password for user:', data.user);
      
      const requestData = {
        key: data.key,
        user: data.user,
        new_password: data.new_password
      };
      
      const response = await this.client.post('/method/external_reset.api.register.update_user_password', requestData);
      
      if (response.data.message && response.data.message.success) {
        return {
          success: true,
          message: 'Heslo bolo úspešne zmenené'
        };
      } else if (response.data.message && response.data.message.error) {
        return {
          success: false,
          message: response.data.message.error
        };
      } else {
        return {
          success: true,
          message: 'Heslo bolo úspešne zmenené'
        };
      }
    } catch (error) {
      console.error('Error updating password in ERPNext:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
          return {
            success: false,
            message: error.response.data.message
          };
        }
        if (error.response?.data?.exc) {
          const excMessage = error.response.data.exc;
          if (typeof excMessage === 'string') {
            if (excMessage.includes('invalid') || excMessage.includes('expired')) {
              return {
                success: false,
                message: 'Odkaz na zmenu hesla je neplatný alebo vypršal'
              };
            }
            if (excMessage.includes('not found')) {
              return {
                success: false,
                message: 'Používateľ nebol nájdený'
              };
            }
          }
          return {
            success: false,
            message: 'Chyba pri zmene hesla'
          };
        }
        if (error.response?.status === 400) {
          return {
            success: false,
            message: 'Neplatné údaje pre zmenu hesla'
          };
        }
        if (error.response?.status === 404) {
          return {
            success: false,
            message: 'Odkaz na zmenu hesla je neplatný alebo vypršal'
          };
        }
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          return {
            success: false,
            message: 'Neplatné údaje pre zmenu hesla'
          };
        }
      }
      
      return {
        success: false,
        message: 'Chyba pri zmene hesla'
      };
    }
  }

  // Get user profile data from ERPNext
  async getUserProfile(email: string): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      console.log('Getting user profile for:', email);
      
      // Try to get customer data from ERPNext
      const response = await this.client.get(`/resource/Customer?filters=[["email_id","=","${email}"]]&fields=["first_name","last_name","email_id","mobile_no","customer_name"]`);
      
      if (response.data.data && response.data.data.length > 0) {
        const customer = response.data.data[0];
        return {
          success: true,
          data: {
            email: customer.email_id,
            firstName: customer.first_name || '',
            lastName: customer.last_name || '',
            mobile: customer.mobile_no || ''
          },
          message: 'Profil načítaný úspešne'
        };
      } else {
        return {
          success: false,
          message: 'Používateľ nebol nájdený'
        };
      }
    } catch (error) {
      console.error('Error getting user profile from ERPNext:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return {
            success: false,
            message: 'Používateľ nebol nájdený'
          };
        }
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          return {
            success: false,
            message: 'Neplatné údaje používateľa'
          };
        }
      }
      
      return {
        success: false,
        message: 'Chyba pri načítavaní profilu'
      };
    }
  }

  // Update user profile data in ERPNext
  async updateUserProfile(email: string, profileData: { firstName: string; lastName: string; email: string; mobile?: string }): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Updating user profile for:', email);
      
      // First, find the customer by email
      const searchResponse = await this.client.get(`/resource/Customer?filters=[["email_id","=","${email}"]]&fields=["name"]`);
      
      if (!searchResponse.data.data || searchResponse.data.data.length === 0) {
        return {
          success: false,
          message: 'Používateľ nebol nájdený'
        };
      }

      const customerName = searchResponse.data.data[0].name;
      
      // Update customer data
      const updateData = {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email_id: profileData.email,
        mobile_no: profileData.mobile || '',
        customer_name: `${profileData.firstName} ${profileData.lastName}`
      };

      const updateResponse = await this.client.put(`/resource/Customer/${customerName}`, updateData);
      
      if (updateResponse.status === 200) {
        return {
          success: true,
          message: 'Profil bol úspešne aktualizovaný'
        };
      } else {
        return {
          success: false,
          message: 'Chyba pri aktualizácii profilu'
        };
      }
    } catch (error) {
      console.error('Error updating user profile in ERPNext:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
          return {
            success: false,
            message: error.response.data.message
          };
        }
        if (error.response?.status === 404) {
          return {
            success: false,
            message: 'Používateľ nebol nájdený'
          };
        }
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          return {
            success: false,
            message: 'Neplatné údaje pre aktualizáciu profilu'
          };
        }
      }
      
      return {
        success: false,
        message: 'Chyba pri aktualizácii profilu'
      };
    }
  }

  // Authenticate user via ERPNext login API
  async loginUser(credentials: { email: string; password: string }): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      console.log('Logging in user:', credentials.email);
      
      // Create a separate axios instance for login (without API token)
      const loginClient = axios.create({
        baseURL: `${this.baseUrl}/api`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000,
        withCredentials: true // Important for cookies
      });
      
      const loginData = new URLSearchParams({
        usr: credentials.email,
        pwd: credentials.password
      });
      
      // Use ERPNext's login method
      const response = await loginClient.post('/method/login', loginData);
      
      if (response.status === 200) {
        // Login successful, extract user information from response
        let userData = {
          email: credentials.email,
          name: credentials.email.split('@')[0], // Use email username as fallback
          firstName: '',
          lastName: ''
        };

        // Try to get user data from response
        if (response.data && response.data.message) {
          const msg = response.data.message;
          if (typeof msg === 'object') {
            userData = {
              email: msg.email || credentials.email,
              name: msg.full_name || msg.first_name + ' ' + msg.last_name || userData.name,
              firstName: msg.first_name || '',
              lastName: msg.last_name || ''
            };
          }
        }

        // Clean up name field
        if (userData.name.includes('undefined')) {
          userData.name = userData.firstName && userData.lastName 
            ? `${userData.firstName} ${userData.lastName}`.trim()
            : userData.email.split('@')[0];
        }
        
        return {
          success: true,
          data: userData,
          message: 'Prihlásenie úspešné'
        };
      } else {
        return {
          success: false,
          message: 'Neplatné prihlasovacie údaje'
        };
      }
    } catch (error) {
      console.error('Error logging in user to ERPNext:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
          return {
            success: false,
            message: error.response.data.message
          };
        }
        if (error.response?.data?.exc) {
          const excMessage = error.response.data.exc;
          if (typeof excMessage === 'string') {
            if (excMessage.includes('password') || excMessage.includes('credentials')) {
              return {
                success: false,
                message: 'Neplatné prihlasovacie údaje'
              };
            }
            if (excMessage.includes('user') && excMessage.includes('not found')) {
              return {
                success: false,
                message: 'Používateľ nebol nájdený'
              };
            }
          }
          return {
            success: false,
            message: 'Chyba pri prihlásení'
          };
        }
        if (error.response?.status === 401) {
          return {
            success: false,
            message: 'Neplatné prihlasovacie údaje'
          };
        }
        if (error.response?.status === 403) {
          return {
            success: false,
            message: 'Prístup zamietnutý'
          };
        }
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          return {
            success: false,
            message: 'Neplatné prihlasovacie údaje'
          };
        }
      }
      
      return {
        success: false,
        message: 'Chyba pri prihlásení'
      };
    }
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