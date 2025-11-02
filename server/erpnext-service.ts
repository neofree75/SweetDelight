import axios, { AxiosInstance } from 'axios';
import { 
  ERPNextItem, 
  ERPNextItemVariant, 
  ERPNextPrice, 
  ERPNextCustomer, 
  ERPNextSalesOrder,
  ERPNextSalesInvoice,
  ERPNextPaymentEntry,
  ERPNextItemAttribute,
  ERPNextSalesTaxesAndChargesTemplate,
  Product,
  CustomCakeAttribute,
  CustomCakeAttributeValue
} from '@shared/schema';

export class ERPNextService {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private productCache: { data: Product[]; timestamp: number } | null = null;
  private vatRateCache: { rate: number; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 30 * 1000; // 30 sekúnd
  private readonly VAT_CACHE_DURATION = 5 * 60 * 1000; // 5 minút pre sadzbu DPH
  private customerCreationLocks: Map<string, Promise<string | null>> = new Map();


  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.apiSecret = '';
    this.client = axios.create(); // Placeholder, will be set in refreshClient
    this.refreshClient();
  }

  // Safely log errors without exposing sensitive information like authorization tokens
  private logError(context: string, error: any) {
    if (axios.isAxiosError(error)) {
      // Extract only safe information from Axios errors
      const safeErrorInfo = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        code: error.code,
        // Include response data but not request config/headers
        responseData: error.response?.data
      };
      console.error(context, safeErrorInfo);
    } else if (error instanceof Error) {
      console.error(context, {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    } else {
      console.error(context, 'Unknown error:', String(error));
    }
  }

  // Refresh the axios client with current environment variables
  private refreshClient() {
    this.baseUrl = process.env.ERPNEXT_URL || '';
    this.apiKey = process.env.ERPNEXT_API_KEY || '';
    this.apiSecret = process.env.ERPNEXT_API_SECRET || '';
    
    // Fallback check - if URL doesn't look like a URL, it might be incorrectly set
    if (this.baseUrl && !this.baseUrl.startsWith('http')) {
      console.error(`❌ ERPNEXT_URL "${this.baseUrl}" is not a valid URL. It should start with https://`);
      console.error(`⚠️  Example correct format: https://your-erpnext-domain.com`);
      console.error(`⚠️  Please update your ERPNEXT_URL secret to be a proper URL`);
      this.baseUrl = ''; // Reset to empty to prevent invalid URL errors
    }
    
    // Debug logging to see what values we're getting
    console.log(`ERPNext Config Debug:
      URL: "${this.baseUrl}"
      API Key: "${this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'NOT SET'}"
      API Secret: "${this.apiSecret ? this.apiSecret.substring(0, 8) + '...' : 'NOT SET'}"
      Full Base URL: "${this.baseUrl ? `${this.baseUrl}/api` : 'EMPTY'}"
    `);
    
    this.client = axios.create({
      baseURL: this.baseUrl ? `${this.baseUrl}/api` : '',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${this.apiKey}:${this.apiSecret}`
      },
      timeout: 10000
    });
  }

  // Validate ERPNext credentials and configuration
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    this.refreshClient();
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

    const company = process.env.ERPNEXT_COMPANY || 'DEMO - Glam cake s. r. o.';
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

      // Verify company exists - use correct company name
      try {
        const correctCompanyName = 'DEMO - Glam cake s. r. o.';
        const companyResponse = await this.client.get(`/resource/Company?fields=["name"]&filters=[["name","=","${correctCompanyName}"]]`);
        if (!companyResponse.data.data || companyResponse.data.data.length === 0) {
          return {
            valid: false,
            error: `Company "${correctCompanyName}" does not exist in ERPNext`
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

  // Get all active items from ERPNext (published on website via Website Item)
  async getItems(): Promise<ERPNextItem[]> {
    this.refreshClient();
    try {
      console.log('[getItems] Starting to fetch items from Website Item doctype...');
      
      // Najprv načítaj Website Items, ktoré sú published
      // Používame URL encoding pre medzery v názve doctype
      const websiteItemsResponse = await this.client.get('/resource/Website%20Item', {
        params: {
          fields: JSON.stringify(["name", "item_code", "published", "route", "website_image", "description", "web_item_name"]),
          filters: JSON.stringify([["published", "=", 1]]),
          limit_page_length: 100
        }
      });

      console.log('[getItems] Website Items API response:', {
        status: websiteItemsResponse.status,
        dataLength: websiteItemsResponse.data?.data?.length || 0,
        hasData: !!websiteItemsResponse.data?.data
      });

      const websiteItems = websiteItemsResponse.data.data || [];
      console.log(`[getItems] Found ${websiteItems.length} published Website Items`);
      
      if (websiteItems.length > 0) {
        console.log('[getItems] Sample Website Items:', websiteItems.slice(0, 3).map((wi: any) => ({
          name: wi.name,
          item_code: wi.item_code,
          published: wi.published,
          web_item_name: wi.web_item_name
        })));
      }

      if (websiteItems.length === 0) {
        console.log('[getItems] No published Website Items found, trying without published filter...');
        
        // Skús načítať všetky Website Items bez filtru published
        try {
          const allWebsiteItemsResponse = await this.client.get('/resource/Website%20Item', {
            params: {
              fields: JSON.stringify(["name", "item_code", "published", "route", "website_image", "description", "web_item_name"]),
              limit_page_length: 100
            }
          });
          
          const allWebsiteItems = allWebsiteItemsResponse.data.data || [];
          console.log(`[getItems] Found ${allWebsiteItems.length} total Website Items (without filter)`);
          
          if (allWebsiteItems.length > 0) {
            console.log('[getItems] Sample Website Items data:', allWebsiteItems.slice(0, 3));
            // Použi všetky Website Items, aj keď nie sú published
            const itemCodes = allWebsiteItems.map((wi: any) => wi.item_code).filter(Boolean);
            if (itemCodes.length > 0) {
              websiteItems.push(...allWebsiteItems);
            }
          }
        } catch (fallbackError) {
          console.log('[getItems] Failed to fetch all Website Items, falling back to Item doctype');
        }
        
        if (websiteItems.length === 0) {
          return await this.fallbackToItemDoctype();
        }
      }

      // Získaj všetky item_code z Website Items
      const itemCodes = websiteItems.map((wi: any) => wi.item_code).filter(Boolean);
      console.log(`[getItems] Extracted ${itemCodes.length} item codes:`, itemCodes.slice(0, 5));
      
      if (itemCodes.length === 0) {
        console.log('[getItems] No item codes found in Website Items');
        return await this.fallbackToItemDoctype();
      }

      // ERPNext "in" filter môže byť problém - skúsme načítať Items jeden po druhom alebo použiť alternatívny prístup
      // Najprv skúsime s "in" filtrom
      let items: any[] = [];
      
      try {
        // ERPNext API "in" filter syntax
        const itemsResponse = await this.client.get('/resource/Item', {
          params: {
            fields: '["name","item_name","description","item_group","stock_uom","is_stock_item","disabled","image","valuation_rate","has_variants","variant_of","custom_min_mnozstvo_obj_predaj","attributes"]',
            filters: JSON.stringify([["name", "in", itemCodes]]),
            limit_page_length: 100
          }
        });

        items = itemsResponse.data.data || [];
        console.log(`[getItems] Found ${items.length} corresponding Items using "in" filter`);
      } catch (inFilterError: any) {
        console.log('[getItems] "in" filter failed, trying individual requests...', inFilterError.message);
        
        // Fallback: načítaj Items jeden po druhom (pomalšie, ale funguje)
        items = [];
        for (const itemCode of itemCodes.slice(0, 50)) { // Limit na 50 aby to netrvalo príliš dlho
          try {
            const itemResponse = await this.client.get(`/resource/Item/${encodeURIComponent(itemCode)}`);
            if (itemResponse.data.data && !itemResponse.data.data.disabled) {
              items.push(itemResponse.data.data);
            }
          } catch (itemError) {
            console.log(`[getItems] Failed to fetch Item ${itemCode}:`, itemError);
          }
        }
        console.log(`[getItems] Found ${items.length} Items using individual requests`);
      }

      if (items.length === 0) {
        console.log('[getItems] No Items found, using Website Items directly...');
        // Ak sa nepodarilo načítať Items, použijeme Website Items priamo
        return websiteItems.map((wi: any) => ({
          name: wi.item_code || wi.name,
          item_name: wi.web_item_name || wi.item_code || wi.name,
          description: wi.description || '',
          item_group: 'Uncategorized', // Default ak nemáme Item data
          stock_uom: 'Nos',
          is_stock_item: true,
          disabled: false,
          image: wi.website_image || '',
          valuation_rate: 0,
          has_variants: false,
          variant_of: null,
          custom_min_mnozstvo_obj_predaj: 1,
          attributes: [],
          published: wi.published || 0,
          route: wi.route
        }));
      }

      // Map Website Item data onto Item records
      const itemsWithWebsiteData = items.map((item: any) => {
        const websiteItem = websiteItems.find((wi: any) => wi.item_code === item.name);
        
        return {
          ...item,
          // Použi web_item_name z Website Item ak existuje, inak item_name
          item_name: websiteItem?.web_item_name || item.item_name,
          // Použi description z Website Item ak existuje, inak z Item
          description: websiteItem?.description || item.description,
          // Použi website_image z Website Item ak existuje, inak image z Item
          image: websiteItem?.website_image || item.image,
          // Published status z Website Item
          published: websiteItem?.published || 0,
          // Route z Website Item
          route: websiteItem?.route
        };
      });

      console.log(`[getItems] Returning ${itemsWithWebsiteData.length} items with Website Item data`);
      return itemsWithWebsiteData;
    } catch (error) {
      this.logError('Error fetching items from ERPNext:', error);
      console.log('[getItems] Error occurred, trying fallback...');
      return await this.fallbackToItemDoctype();
    }
  }

  // Fallback method to load items directly from Item doctype
  private async fallbackToItemDoctype(): Promise<ERPNextItem[]> {
    try {
      console.log('[getItems] Fallback: Loading from Item doctype with published filter...');
      const response = await this.client.get('/resource/Item', {
        params: {
          fields: '["name","item_name","description","item_group","stock_uom","is_stock_item","disabled","image","valuation_rate","has_variants","variant_of","custom_min_mnozstvo_obj_predaj","published","show_in_website","attributes"]',
          filters: JSON.stringify([
            ["disabled", "=", "0"],
            ["published", "=", "1"]
          ]),
          limit_page_length: 100
        }
      });
      
      const items = response.data.data || [];
      console.log(`[getItems] Fallback: Found ${items.length} items from Item doctype`);
      return items;
    } catch (fallbackError) {
      this.logError('Error in fallback Item fetch:', fallbackError);
      return [];
    }
  }

  // Get variants for a specific item template (published on website via Website Item)
  async getItemVariants(templateName: string): Promise<ERPNextItemVariant[]> {
    this.refreshClient();
    try {
      console.log(`Debug: Fetching variants for template: ${templateName}`);
      
      // Najprv nájdi všetky Item varianty
      const itemVariantsResponse = await this.client.get('/resource/Item', {
        params: {
          fields: '["name","item_name","description","variant_of","custom_min_mnozstvo_obj_predaj","attributes","valuation_rate","disabled"]',
          filters: JSON.stringify([
            ["variant_of", "=", templateName],
            ["disabled", "=", "0"]
          ]),
          limit_page_length: 50
        }
      });

      const itemVariants = itemVariantsResponse.data.data || [];
      
      if (itemVariants.length === 0) {
        return [];
      }

      // Získaj item_code z variantov
      const variantCodes = itemVariants.map((v: any) => v.name);
      
      // Nájdi Website Items pre tieto varianty
      const websiteItemsResponse = await this.client.get('/resource/Website%20Item', {
        params: {
          fields: JSON.stringify(["name", "item_code", "published", "web_item_name", "description", "website_image"]),
          filters: JSON.stringify([
            ["item_code", "in", variantCodes],
            ["published", "=", 1]
          ]),
          limit_page_length: 50
        }
      });

      const websiteItems = websiteItemsResponse.data.data || [];
      console.log(`Debug: Found ${websiteItems.length} published Website Items for variants of ${templateName}`);

      // Map Website Item data onto variants
      const variantsWithWebsiteData = itemVariants
        .filter((variant: any) => {
          // Len varianty, ktoré majú published Website Item
          return websiteItems.some((wi: any) => wi.item_code === variant.name);
        })
        .map((variant: any) => {
          const websiteItem = websiteItems.find((wi: any) => wi.item_code === variant.name);
          
          return {
            ...variant,
            item_name: websiteItem?.web_item_name || variant.item_name,
            description: websiteItem?.description || variant.description,
            published: websiteItem?.published || 0,
          };
        });

      console.log(`Debug: Found ${variantsWithWebsiteData.length} published variants for ${templateName}`);
      return variantsWithWebsiteData;
    } catch (error) {
      console.error(`Error fetching variants for ${templateName}:`, error);
      
      // Fallback: skús načítať priamo z Item
      try {
        const response = await this.client.get('/resource/Item', {
          params: {
            fields: '["name","item_name","description","variant_of","custom_min_mnozstvo_obj_predaj","published","show_in_website","attributes","valuation_rate","disabled"]',
            filters: JSON.stringify([
              ["variant_of", "=", templateName],
              ["disabled", "=", "0"],
              ["published", "=", "1"]
            ]),
            limit_page_length: 50
          }
        });
        return response.data.data || [];
      } catch (fallbackError) {
        console.error(`Error in fallback variant fetch for ${templateName}:`, fallbackError);
        return [];
      }
    }
  }


  // Search for existing customer by email
  async findCustomerByEmail(email: string): Promise<{customerId: string; needsGroupUpdate: boolean} | null> {
    this.refreshClient();
    try {
      // Normalize email (trim and lowercase)
      const normalizedEmail = email.trim().toLowerCase();
      
      const response = await this.client.get('/resource/Customer', {
        params: {
          fields: '["name","customer_name","email_id","customer_group"]',
          filters: JSON.stringify([["email_id", "=", normalizedEmail]]),
          limit_page_length: 1
        }
      });

      const customers = response.data.data || [];
      if (customers.length > 0) {
        const customer = customers[0];
        const needsGroupUpdate = customer.customer_group !== "Internetový predaj";
        console.log(`Found existing customer: ${customer.name} (${customer.customer_name}), group: ${customer.customer_group}, needs update: ${needsGroupUpdate}`);
        
        return {
          customerId: customer.name,
          needsGroupUpdate: needsGroupUpdate
        };
      }

      return null;
    } catch (error) {
      this.logError('Error searching for customer in ERPNext:', error);
      return null;
    }
  }

  // Update customer's group in ERPNext
  async updateCustomerGroup(customerId: string, customerGroup: string): Promise<boolean> {
    this.refreshClient();
    try {
      await this.client.put(`/resource/Customer/${customerId}`, {
        customer_group: customerGroup
      });
      console.log(`Updated customer ${customerId} group to: ${customerGroup}`);
      return true;
    } catch (error) {
      console.error(`Error updating customer group for ${customerId}:`, error);
      return false;
    }
  }

  // Create customer in ERPNext
  async createCustomer(customerData: Omit<ERPNextCustomer, 'name'>): Promise<string | null> {
    this.refreshClient();
    try {
      const response = await this.client.post('/resource/Customer', customerData);

      return response.data.data.name;
    } catch (error) {
      this.logError('Error creating customer in ERPNext:', error);
      return null;
    }
  }

  // Find or create customer in ERPNext with concurrency protection
  async findOrCreateCustomer(customerData: Omit<ERPNextCustomer, 'name'>): Promise<string | null> {
    this.refreshClient();
    
    if (!customerData.email_id) {
      return await this.createCustomer(customerData);
    }

    const normalizedEmail = customerData.email_id.trim().toLowerCase();
    
    // Check if there's already a creation operation in progress for this email
    const existingLock = this.customerCreationLocks.get(normalizedEmail);
    if (existingLock) {
      console.log(`Waiting for existing customer creation operation for: ${normalizedEmail}`);
      return await existingLock;
    }

    // Create new creation operation for this email
    const creationPromise = this.doFindOrCreateCustomer(customerData, normalizedEmail);
    this.customerCreationLocks.set(normalizedEmail, creationPromise);
    
    try {
      const result = await creationPromise;
      return result;
    } finally {
      // Clean up the lock regardless of success or failure
      this.customerCreationLocks.delete(normalizedEmail);
    }
  }

  // Internal method that actually performs the find-or-create logic
  private async doFindOrCreateCustomer(customerData: Omit<ERPNextCustomer, 'name'>, normalizedEmail: string): Promise<string | null> {
    // Najprv sa pokús nájsť existujúceho zákazníka
    const existingCustomer = await this.findCustomerByEmail(normalizedEmail);
    
    if (existingCustomer) {
      // Ak zákazník existuje ale má inú skupinu, aktualizuj ju
      if (existingCustomer.needsGroupUpdate) {
        const updated = await this.updateCustomerGroup(existingCustomer.customerId, "Internetový predaj");
        if (updated) {
          console.log(`Customer ${existingCustomer.customerId} updated to "Internetový predaj" group`);
        }
      }
      return existingCustomer.customerId;
    }

    // Ak zákazník neexistuje, vytvor nového s normalizovaným emailom
    const normalizedCustomerData = {
      ...customerData,
      email_id: normalizedEmail
    };
    
    try {
      const customerId = await this.createCustomer(normalizedCustomerData);
      if (customerId) {
        return customerId;
      }
      
      // Ak sa customer nevytvoril, pokús sa ho nájsť znovu (možno ho medzitým vytvoril iný proces)
      const existingCustomer = await this.findCustomerByEmail(normalizedEmail);
      if (existingCustomer) {
        console.log(`Found existing customer after creation failed: ${existingCustomer.customerId}`);
        return existingCustomer.customerId;
      }
      
      return null;
    } catch (error) {
      // Ak nastala chyba pri vytváraní, skús znovu nájsť zákazníka (možno je to duplicate error)
      const existingCustomer = await this.findCustomerByEmail(normalizedEmail);
      if (existingCustomer) {
        console.log(`Found existing customer after creation error: ${existingCustomer.customerId}`);
        return existingCustomer.customerId;
      }
      
      this.logError('Error in doFindOrCreateCustomer:', error);
      return null;
    }
  }

  // Create sales order in ERPNext
  async createSalesOrder(orderData: ERPNextSalesOrder): Promise<string | null> {
    this.refreshClient();
    try {
      const response = await this.client.post('/resource/Sales%20Order', orderData);

      return response.data.data.name;
    } catch (error) {
      this.logError('Error creating sales order in ERPNext:', error);
      return null;
    }
  }

  // Načítaj objednávky pre špecifického zákazníka
  async getOrdersByCustomer(customerId: string): Promise<any[]> {
    this.refreshClient();
    try {
      const response = await this.client.get('/resource/Sales%20Order', {
        params: {
          filters: JSON.stringify([['customer', '=', customerId]]),
          fields: JSON.stringify([
            'name', 'status', 'workflow_state', 'customer', 'customer_name', 
            'transaction_date', 'delivery_date', 'total', 'grand_total', 
            'currency', 'items'
          ]),
          order_by: 'creation desc',
          limit_page_length: 100
        }
      });

      // Načítaj podrobnosti objednávok vrátane položiek
      const ordersWithItems = await Promise.all(
        response.data.data.map(async (order: any) => {
          try {
            // Načítaj podrobnosti objednávky vrátane položiek
            const orderDetails = await this.client.get(`/resource/Sales%20Order/${order.name}`);
            return orderDetails.data.data;
          } catch (error) {
            console.error(`Error fetching order details for ${order.name}:`, error);
            return order; // Vráť základné údaje ak sa nepodarí načítať podrobnosti
          }
        })
      );

      return ordersWithItems;
    } catch (error) {
      console.error('Error fetching orders from ERPNext:', error);
      return [];
    }
  }

  // Get Sales Order by ID with full details
  async getSalesOrderById(salesOrderId: string): Promise<any | null> {
    this.refreshClient();
    try {
      const response = await this.client.get(`/resource/Sales%20Order/${salesOrderId}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching Sales Order ${salesOrderId}:`, error);
      return null;
    }
  }

  // Create Sales Invoice from Sales Order
  async createSalesInvoiceFromOrder(salesOrderId: string, invoiceData?: Partial<ERPNextSalesInvoice>, overrideCustomerId?: string): Promise<string | null> {
    this.refreshClient();
    try {
      // Get the Sales Order details first
      const salesOrder = await this.getSalesOrderById(salesOrderId);
      if (!salesOrder) {
        console.error(`Sales Order ${salesOrderId} not found`);
        return null;
      }

      // Create Sales Invoice based on Sales Order
      const salesInvoiceData = {
        customer: overrideCustomerId || salesOrder.customer,
        company: salesOrder.company || 'DEMO - Glam cake s. r. o.',
        posting_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        currency: salesOrder.currency || 'EUR',
        items: salesOrder.items.map((item: any) => ({
          item_code: item.item_code,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          stock_uom: item.stock_uom || 'Nos',
          parentfield: 'items',
          item_name: item.item_name,
          description: item.description,
          sales_order: salesOrderId, // Link to original Sales Order
          so_detail: item.name // Link to Sales Order item
        })),
        // Override with any custom data
        ...invoiceData
      };

      const response = await this.client.post('/resource/Sales%20Invoice', salesInvoiceData);
      
      // Submit the invoice to make it active
      const invoiceId = response.data.data.name;
      await this.client.put(`/resource/Sales%20Invoice/${invoiceId}`, {
        docstatus: 1 // Submit the document
      });

      console.log(`Sales Invoice ${invoiceId} created from Sales Order ${salesOrderId}`);
      return invoiceId;
    } catch (error) {
      console.error('Error creating Sales Invoice from Sales Order:', error);
      return null;
    }
  }

  // Update Sales Order status
  async updateSalesOrderStatus(salesOrderId: string, status: string): Promise<boolean> {
    this.refreshClient();
    try {
      await this.client.put(`/resource/Sales Order/${salesOrderId}`, {
        status: status
      });
      
      console.log(`Sales Order ${salesOrderId} status updated to: ${status}`);
      return true;
    } catch (error) {
      console.error('Error updating Sales Order status:', error);
      return false;
    }
  }

  // Create Payment Entry for advance payment or invoice payment
  async createPaymentEntry(paymentData: ERPNextPaymentEntry): Promise<string | null> {
    this.refreshClient();
    try {
      const response = await this.client.post('/resource/Payment%20Entry', paymentData);
      
      // Submit the payment entry to make it active
      const paymentId = response.data.data.name;
      await this.client.put(`/resource/Payment%20Entry/${paymentId}`, {
        docstatus: 1 // Submit the document
      });

      console.log(`Payment Entry ${paymentId} created`);
      return paymentId;
    } catch (error) {
      console.error('Error creating Payment Entry:', error);
      return null;
    }
  }

  // Create advance payment against Sales Order (záloha)
  async createAdvancePayment(salesOrderId: string, amount: number, referenceNo?: string): Promise<string | null> {
    this.refreshClient();
    try {
      // Get Sales Order details to get customer info
      const salesOrder = await this.getSalesOrderById(salesOrderId);
      if (!salesOrder) {
        console.error(`Sales Order ${salesOrderId} not found`);
        return null;
      }

      const paymentData: ERPNextPaymentEntry = {
        payment_type: 'Receive',
        party_type: 'Customer',
        party: salesOrder.customer,
        company: salesOrder.company || 'DEMO - Glam cake s. r. o.',
        mode_of_payment: 'Card Payment',
        paid_amount: amount,
        received_amount: amount,
        currency: 'EUR',
        posting_date: new Date().toISOString().split('T')[0],
        reference_no: referenceNo,
        reference_date: new Date().toISOString().split('T')[0],
        references: [{
          reference_doctype: 'Sales Order',
          reference_name: salesOrderId,
          allocated_amount: amount,
          parentfield: 'references'
        }]
      };

      return await this.createPaymentEntry(paymentData);
    } catch (error) {
      console.error('Error creating advance payment:', error);
      return null;
    }
  }

  // Clear product cache
  async clearProductCache(): Promise<void> {
    this.refreshClient();
    this.productCache = null;
    console.log('Product cache cleared');
  }

  // Načítanie predvolenej sadzby DPH z ERPNext Sales Taxes and Charges Template
  async getDefaultVATRate(): Promise<number> {
    try {
      // Skontrolovať cache
      if (this.vatRateCache && Date.now() - this.vatRateCache.timestamp < this.VAT_CACHE_DURATION) {
        return this.vatRateCache.rate;
      }

      console.log('Fetching default VAT rate from ERPNext...');
      
      // Načítať predvolenú šablónu daní
      const response = await this.client.get(`/resource/Sales Taxes and Charges Template`, {
        params: {
          filters: JSON.stringify([['is_default', '=', 1]]),
          fields: JSON.stringify(['name', 'taxes']),
          limit: 1
        }
      });

      if (response.data?.data && response.data.data.length > 0) {
        const template = response.data.data[0];
        
        // Načítať podrobnosti šablóny vrátane daní (správne enkódovať názov)
        const encodedTemplateName = encodeURIComponent(template.name);
        const detailResponse = await this.client.get(`/resource/Sales Taxes and Charges Template/${encodedTemplateName}`);
        
        if (detailResponse.data?.data && detailResponse.data.data.taxes && detailResponse.data.data.taxes.length > 0) {
          // Vziať prvú sadzbu z prvej dane v šablóne (obvykle DPH)
          const firstTax = detailResponse.data.data.taxes[0];
          const vatRate = parseFloat(firstTax.rate) || 20;
          
          console.log(`Loaded VAT rate from ERPNext template "${template.name}": ${vatRate}%`);
          
          // Uložiť do cache
          this.vatRateCache = {
            rate: vatRate,
            timestamp: Date.now()
          };
          
          return vatRate;
        }
      }
      
      console.warn('No default tax template found in ERPNext, using 20% VAT rate');
      return 20;
    } catch (error) {
      console.error('Error fetching VAT rate from ERPNext:', error);
      // Fallback na slovenskú štandardnú sadzbu DPH
      return 20;
    }
  }

  // Transform ERPNext items to frontend product format with caching
  async getProductsForFrontend(): Promise<Product[]> {
    this.refreshClient();
    
    // Skontroluj cache
    if (this.productCache && 
        Date.now() - this.productCache.timestamp < this.CACHE_DURATION) {
      return this.productCache.data;
    }

    const items = await this.getItems();
    
    if (items.length === 0) {
      console.log('No items found in ERPNext');
      return [];
    }

    // Načítať sadzbu DPH raz pre všetky produkty
    const vatRate = await this.getDefaultVATRate();

    // Transform items to products
    const products = await Promise.all(items.map(async item => {
      // Oprav image URL - pridaj ERPNext base URL pre obrázky
      let imageUrl = '/placeholder-product.jpg';
      if (item.image && item.image.startsWith('/files/')) {
        imageUrl = `${this.baseUrl}${item.image}`;
      } else if (item.image) {
        imageUrl = item.image;
      }

      // Calculate VAT information using rate from ERPNext tax template

      const priceWithoutVat = item.valuation_rate || 0;
      const priceWithVat = priceWithoutVat * (1 + vatRate / 100);

      // Ak má produkt varianty, načítaj ich
      let variants = undefined;
      
      if (Boolean(item.has_variants)) {
        console.log(`Debug: Product ${item.name} has variants, loading them...`);
        const itemVariants = await this.getItemVariants(item.name);
        variants = itemVariants.map(variant => {
          const variantPriceWithoutVat = variant.valuation_rate || 0;
          const variantPriceWithVat = variantPriceWithoutVat * (1 + vatRate / 100);
          return {
            id: variant.name,
            name: variant.item_name,
            minOrderQuantity: Number(variant.custom_min_mnozstvo_obj_predaj) || 1,
            attributes: (variant.attributes || []).map(attr => ({
              attribute: attr.attribute,
              value: attr.attribute_value || ''
            })),
            price: variantPriceWithoutVat, // Cena bez DPH
            vatRate: vatRate, // Sadzba DPH v percentách
            priceWithVat: Math.round(variantPriceWithVat * 100) / 100, // Cena s DPH
          };
        });
        console.log(`Debug: Mapped ${variants.length} variants for ${item.name}`);
      }

      return {
        id: item.name,
        name: item.item_name,
        description: item.description || '',
        price: priceWithoutVat, // Cena bez DPH
        image: imageUrl,
        category: item.item_group,
        inStock: !item.disabled,
        minOrderQuantity: Number(item.custom_min_mnozstvo_obj_predaj) || 1,
        hasVariants: item.has_variants || false,
        variants: variants,
        vatRate: vatRate, // Sadzba DPH v percentách
        priceWithVat: Math.round(priceWithVat * 100) / 100, // Cena s DPH (zaokrúhlená na 2 des. miesta)
      };
    }));

    // Vyfiltrovať TORTCUS001 z produktov zobrazovaných v obchode
    // (Tento produkt sa používa len pre torty na mieru cez špeciálnu stránku)
    const filteredProducts = products.filter(product => product.id !== 'TORTCUS001');

    // Ulož do cache
    this.productCache = {
      data: filteredProducts,
      timestamp: Date.now()
    };

    return filteredProducts;
  }

  // Získaj konkrétny produkt podľa ID
  async getProductById(productId: string): Promise<Product | null> {
    this.refreshClient();
    
    // Najprv skús nájsť produkt v cached produktoch
    const products = await this.getProductsForFrontend();
    const cachedProduct = products.find(p => p.id === productId);
    
    if (cachedProduct) {
      return cachedProduct;
    }
    
    // Ak produkt nebol nájdený v cache (napr. TORTCUS001), načítaj ho priamo z ERPNext
    try {
      const response = await this.client.get(`/resource/Item/${productId}`, {
        params: {
          fields: '["name","item_name","description","item_group","stock_uom","is_stock_item","disabled","image","valuation_rate","has_variants","variant_of","custom_min_mnozstvo_obj_predaj","published","show_in_website","attributes"]'
        }
      });

      const item = response.data.data;
      
      if (!item || item.disabled) {
        return null;
      }

      // Pre produkty zobrazované v obchode, skontroluj či je published
      // (TORTCUS001 môže byť nepublished, lebo sa používa len pre custom orders)
      if (productId !== 'TORTCUS001' && !item.published) {
        console.log(`Product ${productId} is not published, skipping`);
        return null;
      }

      // Oprav image URL - pridaj ERPNext base URL pre obrázky
      let imageUrl = '/placeholder-product.jpg';
      if (item.image && item.image.startsWith('/files/')) {
        imageUrl = `${this.baseUrl}${item.image}`;
      } else if (item.image) {
        imageUrl = item.image;
      }

      // Calculate VAT information using rate from ERPNext tax template
      const vatRate = await this.getDefaultVATRate();
      const priceWithoutVat = item.valuation_rate || 0;
      const priceWithVat = priceWithoutVat * (1 + vatRate / 100);

      // Ak má produkt varianty, načítaj ich
      let variants = undefined;
      if (Boolean(item.has_variants)) {
        const itemVariants = await this.getItemVariants(item.name);
        variants = itemVariants.map(variant => {
          const variantPriceWithoutVat = variant.valuation_rate || 0;
          const variantPriceWithVat = variantPriceWithoutVat * (1 + vatRate / 100);
          return {
            id: variant.name,
            name: variant.item_name,
            minOrderQuantity: Number(variant.custom_min_mnozstvo_obj_predaj) || 1,
            attributes: (variant.attributes || []).map(attr => ({
              attribute: attr.attribute,
              value: attr.attribute_value || ''
            })),
            price: variantPriceWithoutVat, // Cena bez DPH
            vatRate: vatRate, // Sadzba DPH v percentách
            priceWithVat: Math.round(variantPriceWithVat * 100) / 100, // Cena s DPH
          };
        });
      }

      return {
        id: item.name,
        name: item.item_name,
        description: item.description || '',
        price: priceWithoutVat, // Cena bez DPH
        image: imageUrl,
        category: item.item_group,
        inStock: !item.disabled,
        minOrderQuantity: Number(item.custom_min_mnozstvo_obj_predaj) || 1,
        hasVariants: item.has_variants || false,
        variants: variants,
        vatRate: vatRate, // Sadzba DPH v percentách
        priceWithVat: Math.round(priceWithVat * 100) / 100, // Cena s DPH (zaokrúhlená na 2 des. miesta)
      };
      
    } catch (error) {
      console.error(`Error fetching product ${productId} directly from ERPNext:`, error);
      return null;
    }
  }

  // Register user in ERPNext
  async registerUser(userData: {
    email: string;
    first_name: string;
    last_name: string;
    mobile_no?: string;
  }): Promise<{ success: boolean; message: string }> {
    this.refreshClient();
    try {
      const response = await this.client.post('/method/external_reset.api.register.register_user', userData);
      
      let registrationSuccess = false;
      if (response.data.message && response.data.message.success) {
        registrationSuccess = true;
      } else if (response.data.message && response.data.message.error) {
        return {
          success: false,
          message: response.data.message.error
        };
      } else {
        registrationSuccess = true;
      }

      // Poznámka: Customer a Contact záznamy sa vytvoria automaticky až po email verification
      // a zmene hesla v ERPNext. Mobile number sa pridá pri prvom prihlásení ak je potrebné.
      if (registrationSuccess && userData.mobile_no) {
        console.log('User registered successfully. Customer record will be created after email verification.');
      }

      if (registrationSuccess) {
        // Po úspešnej registrácii vytvor Customer záznam so skupinou "Internetový predaj"
        try {
          const customerData = {
            customer_name: `${userData.first_name} ${userData.last_name}`,
            customer_type: "Individual",
            customer_group: "Internetový predaj",
            territory: "Slovakia",
            email_id: userData.email.toLowerCase(),
            mobile_no: userData.mobile_no || ""
          };

          const customerId = await this.findOrCreateCustomer(customerData);
          if (customerId) {
            console.log(`Customer ${customerId} created/found successfully with group "Internetový predaj"`);
          } else {
            console.warn('User registered but customer creation/lookup failed');
          }
        } catch (customerError) {
          // Pokračuj aj keď sa Customer nevytvorí - User je už zaregistrovaný
          console.warn('Customer creation failed during registration:', customerError);
        }

        return {
          success: true,
          message: 'Registrácia bola úspešná'
        };
      } else {
        return {
          success: false,
          message: 'Chyba pri registrácii'
        };
      }
    } catch (error) {
      this.logError('Error registering user in ERPNext:', error);
      
      if (axios.isAxiosError(error)) {
        // Check for specific ERPNext validation error messages
        if (error.response?.data?.exception) {
          const exception = error.response.data.exception;
          if (typeof exception === 'string') {
            // Extract user-friendly message from ValidationError
            if (exception.includes('už existuje')) {
              return {
                success: false,
                message: 'Používateľ s týmto emailom už existuje'
              };
            }
          }
        }
        
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
    this.refreshClient();
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
      this.logError('Error updating password in ERPNext:', error);
      
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

  // Request password reset via ERPNext external_reset module ONLY
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    this.refreshClient();
    
    try {
      console.log('Requesting password reset via external_reset for:', email);
      
      const response = await this.client.post('/method/external_reset.api.register.request_password_reset', {
        email: email
      });
      
      if (response.data.message && response.data.message.success) {
        return {
          success: true,
          message: 'Email s odkazom na obnovenie hesla bol odoslaný'
        };
      } else if (response.data.message && response.data.message.error) {
        return {
          success: false,
          message: response.data.message.error
        };
      } else {
        return {
          success: true,
          message: 'Ak účet existuje, email s odkazom bol odoslaný'
        };
      }
    } catch (error) {
      console.error('Error with external_reset module:', error);
      
      if (axios.isAxiosError(error)) {
        // Skontroluj či je problém s chýbajúcim importom
        if (error.response?.status === 500 && 
            error.response?.data?.exception?.includes("name 'random_string' is not defined")) {
          return {
            success: false,
            message: 'ERPNext server chyba: external_reset modul potrebuje opravu importu pre random_string funkciu'
          };
        }
        
        if (error.response?.data?.exc) {
          const excMessage = error.response.data.exc;
          if (typeof excMessage === 'string') {
            if (excMessage.includes('not found') || excMessage.includes('does not exist')) {
              return {
                success: true, // Bezpečnosť: neodhalíme či účet existuje
                message: 'Ak účet existuje, email s odkazom bol odoslaný'
              };
            }
          }
        }
        
        if (error.response?.status === 404) {
          return {
            success: true, // Bezpečnosť: neodhalíme či účet existuje
            message: 'Ak účet existuje, email s odkazom bol odoslaný'
          };
        }
        
        if (error.response?.status === 500) {
          return {
            success: false,
            message: 'ERPNext server chyba v external_reset module'
          };
        }
      }
      
      return {
        success: false,
        message: 'Chyba pri odosielaní emailu na obnovenie hesla'
      };
    }
  }

  // Update password using frontend token
  async updatePasswordFrontend(data: { token: string; new_password: string }): Promise<{ success: boolean; message: string }> {
    this.refreshClient();
    try {
      console.log('Updating password with frontend token');
      
      const response = await this.client.post('/method/external_reset.api.register.update_password_frontend', {
        token: data.token,
        new_password: data.new_password
      });
      
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
      console.error('Error updating password via frontend token in ERPNext:', error);
      
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
            if (excMessage.includes('token') && excMessage.includes('not found')) {
              return {
                success: false,
                message: 'Odkaz na zmenu hesla je neplatný alebo vypršal'
              };
            }
          }
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
      }
      
      return {
        success: false,
        message: 'Chyba pri zmene hesla'
      };
    }
  }

  // Check if user is System User (admin) in ERPNext
  async isSystemUser(email: string): Promise<{ success: boolean; isSystemUser: boolean; message: string }> {
    this.refreshClient();
    try {
      console.log('Checking if user is System User:', email);
      
      // Get User doctype data to check user_type
      const userFields = ["name", "email", "user_type", "enabled"];
      
      const userResponse = await this.client.get(`/resource/User?filters=[["email","=","${email}"]]&fields=${JSON.stringify(userFields)}`);
      
      if (userResponse.data.data && userResponse.data.data.length > 0) {
        const user = userResponse.data.data[0];
        const isSystemUser = user.user_type === 'System User' && user.enabled === 1;
        
        console.log(`User ${email} is System User: ${isSystemUser} (user_type: ${user.user_type}, enabled: ${user.enabled})`);
        
        return {
          success: true,
          isSystemUser,
          message: isSystemUser ? 'User is System User (admin)' : 'User is not System User'
        };
      } else {
        console.log(`User ${email} not found in User doctype`);
        return {
          success: false,
          isSystemUser: false,
          message: 'User not found in ERPNext User doctype'
        };
      }
    } catch (error: any) {
      console.error('Error checking System User status:', error.message);
      return {
        success: false,
        isSystemUser: false,
        message: `Failed to check user type: ${error.message}`
      };
    }
  }

  // Get user profile data from ERPNext (Customer + primary Contact)
  async getUserProfile(email: string): Promise<{ success: boolean; data?: any; message: string }> {
    this.refreshClient();
    try {
      console.log(`[getUserProfile] Starting profile fetch for: ${email}`);
      console.log(`[getUserProfile] ERPNext client configured:`, { 
        hasUrl: !!process.env.ERP_NEXT_URL, 
        hasApiKey: !!process.env.ERP_NEXT_API_KEY,
        hasApiSecret: !!process.env.ERP_NEXT_API_SECRET 
      });
      
      // Get basic customer data from ERPNext with primary address
      const customerFields = [
        "name", "customer_name", "email_id", 
        "customer_group", "territory", "creation", "modified", "customer_type",
        "customer_primary_address"
      ];
      
      const customerResponse = await this.client.get(`/resource/Customer?filters=[["email_id","=","${email}"]]&fields=${JSON.stringify(customerFields)}`);
      
      if (customerResponse.data.data && customerResponse.data.data.length > 0) {
        // User found in Customer doctype
        const customer = customerResponse.data.data[0];
        
        // Get primary contact data for mobile number and other contact details
        const contactFields = [
          "name", "first_name", "last_name", "email_id", "mobile_no", 
          "phone", "is_primary_contact"
        ];
        
        const contactResponse = await this.client.get(`/resource/Contact?filters=[["email_id","=","${email}"],["is_primary_contact","=","1"]]&fields=${JSON.stringify(contactFields)}`);
        
        let contactData = null;
        if (contactResponse.data.data && contactResponse.data.data.length > 0) {
          contactData = contactResponse.data.data[0];
          console.log('Primary contact found:', contactData.name);
        } else {
          // Fallback: try to find any contact with this email
          const fallbackContactResponse = await this.client.get(`/resource/Contact?filters=[["email_id","=","${email}"]]&fields=${JSON.stringify(contactFields)}&limit_page_length=1`);
          if (fallbackContactResponse.data.data && fallbackContactResponse.data.data.length > 0) {
            contactData = fallbackContactResponse.data.data[0];
            console.log('Fallback contact found:', contactData.name);
          }
        }

        // Use contact data for names if available, otherwise parse from customer_name
        let firstName = '';
        let lastName = '';
        
        if (contactData && contactData.first_name) {
          firstName = contactData.first_name;
          lastName = contactData.last_name || '';
        } else {
          // Fallback: parse from customer_name
          const nameParts = (customer.customer_name || '').split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }

        // Get primary address from customer
        let primaryAddress = null;
        if (customer.customer_primary_address) {
          try {
            // Fetch the specific primary address
            const addressResponse = await this.client.get(`/resource/Address/${customer.customer_primary_address}`);
            if (addressResponse.data.data) {
              primaryAddress = addressResponse.data.data;
              console.log('Primary address found:', primaryAddress.name);
            }
          } catch (addressError) {
            console.warn('Error fetching primary address:', addressError);
          }
        }
        
        // Fallback: if no primary address, try to find first address for this customer
        if (!primaryAddress) {
          try {
            // Try simpler query without Dynamic Link
            const addressListResponse = await this.client.get(`/resource/Address?filters=[["customer","=","${customer.name}"]]&fields=["name","address_line1","address_line2","city","state","pincode","country"]&limit_page_length=1`);
            if (addressListResponse.data.data && addressListResponse.data.data.length > 0) {
              primaryAddress = addressListResponse.data.data[0];
              console.log('Fallback address found:', primaryAddress.name);
            }
          } catch (fallbackError) {
            console.log('Address query with customer field failed, trying generic search...');
            // If customer field doesn't work, skip address loading to prevent errors
            console.warn('Could not load address data. Address fields will be empty.');
          }
        }

        // Check if user is System User (admin)
        const systemUserCheck = await this.isSystemUser(email);
        const isAdmin = systemUserCheck.success && systemUserCheck.isSystemUser;

        return {
          success: true,
          data: {
            // Základné údaje  
            customerId: customer.name || '',
            customerName: customer.customer_name || '',
            firstName: firstName,
            lastName: lastName,
            email: customer.email_id || email,
            
            // Kontaktné údaje (z Contact záznamu)
            mobile: contactData?.mobile_no || '',
            phone: contactData?.phone || '',
            
            // Adresné údaje (z primárnej adresy)
            addressLine1: primaryAddress?.address_line1 || '',
            addressLine2: primaryAddress?.address_line2 || '',
            city: primaryAddress?.city || '',
            state: primaryAddress?.state || '',
            pincode: primaryAddress?.pincode || '',
            country: primaryAddress?.country || '',
            
            // Biznis informácie
            customerGroup: customer.customer_group || '',
            territory: customer.territory || '',
            customerType: customer.customer_type || '',
            
            // Systémové údaje
            created: customer.creation || '',
            modified: customer.modified || '',
            
            // Interiálne IDs pre aktualizácie
            contactId: contactData?.name || '',
            addressId: primaryAddress?.name || '',
            
            // Admin práva
            isAdmin: isAdmin,
            userType: systemUserCheck.success ? (isAdmin ? 'System User' : 'Website User') : 'Unknown'
          },
          message: `Profil načítaný úspešne${isAdmin ? ' (Admin)' : ''}`
        };
      } else {
        // User not found in Customer doctype, try User doctype (System User)
        console.log('User not found in Customer doctype, checking User doctype for:', email);
        
        const userFields = ["name", "email", "user_type", "enabled", "full_name"];
        const userResponse = await this.client.get(`/resource/User?filters=[["email","=","${email}"]]&fields=${JSON.stringify(userFields)}`);
        
        if (userResponse.data.data && userResponse.data.data.length > 0) {
          const user = userResponse.data.data[0];
          console.log('User found in User doctype:', user);
          
          // Check if user is System User (admin)
          const systemUserCheck = await this.isSystemUser(email);
          const isAdmin = systemUserCheck.success && systemUserCheck.isSystemUser;
          
          return {
            success: true,
            data: {
              // Basic info from User doctype
              customerId: user.name || '',
              customerName: user.full_name || user.email || email,
              firstName: user.full_name ? user.full_name.split(' ')[0] : '',
              lastName: user.full_name ? user.full_name.split(' ').slice(1).join(' ') : '',
              email: user.email || email,
              
              // Empty fields for System Users (they don't have customer data)
              mobile: '',
              phone: '',
              addressLine1: '',
              addressLine2: '',
              city: '',
              state: '',
              pincode: '',
              country: '',
              customerGroup: '',
              territory: '',
              customerType: '',
              created: '',
              modified: '',
              contactId: '',
              addressId: '',
              
              // Admin rights
              isAdmin: isAdmin,
              userType: systemUserCheck.success ? (isAdmin ? 'System User' : 'Website User') : 'Unknown'
            },
            message: `System User profil načítaný úspešne${isAdmin ? ' (Admin)' : ''}`
          };
        } else {
          return {
            success: false,
            message: 'Používateľ nebol nájdený ani v Customer, ani v User doctype'
          };
        }
      }
    } catch (error) {
      console.log(`[getUserProfile] Error occurred for ${email}:`, error);
      this.logError('Error getting user profile from ERPNext:', error);
      
      if (axios.isAxiosError(error)) {
        console.log(`[getUserProfile] Axios error details:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message
        });
        
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

  // Update user profile data in ERPNext (Customer + primary Contact + Address)
  async updateUserProfile(email: string, profileData: { 
    firstName: string; 
    lastName: string; 
    email: string; 
    mobile?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  }): Promise<{ success: boolean; message: string }> {
    this.refreshClient();
    try {
      console.log('Updating user profile for:', email);
      
      // First, find the customer by email
      const customerResponse = await this.client.get(`/resource/Customer?filters=[["email_id","=","${email}"]]&fields=["name"]`);
      
      if (!customerResponse.data.data || customerResponse.data.data.length === 0) {
        return {
          success: false,
          message: 'Používateľ nebol nájdený'
        };
      }

      const customerName = customerResponse.data.data[0].name;
      
      // Update customer basic data (name)
      const customerUpdateData = {
        customer_name: `${profileData.firstName} ${profileData.lastName}`,
        email_id: profileData.email
      };

      const customerUpdateResponse = await this.client.put(`/resource/Customer/${customerName}`, customerUpdateData);
      
      if (customerUpdateResponse.status !== 200) {
        return {
          success: false,
          message: 'Chyba pri aktualizácii základných údajov'
        };
      }

      // Find and update primary contact
      const contactResponse = await this.client.get(`/resource/Contact?filters=[["email_id","=","${email}"],["is_primary_contact","=","1"]]&fields=["name"]`);
      
      let contactName = null;
      if (contactResponse.data.data && contactResponse.data.data.length > 0) {
        contactName = contactResponse.data.data[0].name;
        console.log('Found primary contact:', contactName);
      } else {
        // Fallback: find any contact with this email
        const fallbackResponse = await this.client.get(`/resource/Contact?filters=[["email_id","=","${email}"]]&fields=["name"]&limit_page_length=1`);
        if (fallbackResponse.data.data && fallbackResponse.data.data.length > 0) {
          contactName = fallbackResponse.data.data[0].name;
          console.log('Found fallback contact:', contactName);
        }
      }

      if (contactName) {
        // Get existing Contact with child tables (phone_nos, email_ids)
        const existingContactResponse = await this.client.get(`/resource/Contact/${contactName}`);
        const existingContact = existingContactResponse.data.data;
        
        // Update mobile number via Contact Phone child doctype
        if (profileData.mobile) {
          const phoneRows = existingContact.phone_nos || [];
          let primaryPhoneRow = phoneRows.find((row: any) => row.is_primary_mobile_no === 1);
          
          if (primaryPhoneRow) {
            // Update existing primary mobile row
            console.log('Updating existing Contact Phone:', primaryPhoneRow.name);
            const phoneUpdateData = {
              phone: profileData.mobile,
              is_primary_mobile_no: 1,
              is_primary_phone: 0
            };
            
            await this.client.put(`/resource/Contact Phone/${primaryPhoneRow.name}`, phoneUpdateData);
            
            // Set other phone rows as non-primary
            for (const phoneRow of phoneRows) {
              if (phoneRow.name !== primaryPhoneRow.name && phoneRow.is_primary_mobile_no === 1) {
                await this.client.put(`/resource/Contact Phone/${phoneRow.name}`, {
                  phone: phoneRow.phone,
                  is_primary_mobile_no: 0,
                  is_primary_phone: phoneRow.is_primary_phone || 0
                });
              }
            }
          } else {
            // Create new primary mobile row
            console.log('Creating new Contact Phone for contact:', contactName);
            const newPhoneData = {
              doctype: "Contact Phone",
              parent: contactName,
              parenttype: "Contact", 
              parentfield: "phone_nos",
              phone: profileData.mobile,
              is_primary_mobile_no: 1,
              is_primary_phone: 0
            };
            
            await this.client.post(`/resource/Contact Phone`, newPhoneData);
          }
        }
        
        // Update email via Contact Email child doctype
        const emailRows = existingContact.email_ids || [];
        let primaryEmailRow = emailRows.find((row: any) => row.is_primary === 1);
        
        if (primaryEmailRow) {
          // Update existing primary email row
          console.log('Updating existing Contact Email:', primaryEmailRow.name);
          const emailUpdateData = {
            email_id: profileData.email,
            is_primary: 1
          };
          
          await this.client.put(`/resource/Contact Email/${primaryEmailRow.name}`, emailUpdateData);
          
          // Set other email rows as non-primary
          for (const emailRow of emailRows) {
            if (emailRow.name !== primaryEmailRow.name && emailRow.is_primary === 1) {
              await this.client.put(`/resource/Contact Email/${emailRow.name}`, {
                email_id: emailRow.email_id,
                is_primary: 0
              });
            }
          }
        } else {
          // Create new primary email row
          console.log('Creating new Contact Email for contact:', contactName);
          const newEmailData = {
            doctype: "Contact Email",
            parent: contactName,
            parenttype: "Contact",
            parentfield: "email_ids", 
            email_id: profileData.email,
            is_primary: 1
          };
          
          await this.client.post(`/resource/Contact Email`, newEmailData);
        }

        // Finally, update parent Contact for top-level fields
        const contactUpdateData = {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          email_id: profileData.email,
          mobile_no: profileData.mobile || ''
        };

        const contactUpdateResponse = await this.client.put(`/resource/Contact/${contactName}`, contactUpdateData);
        
        if (contactUpdateResponse.status === 200) {
          console.log('Contact updated successfully with child doctypes');
          
          // Handle address update/creation if address data is provided
          if (profileData.addressLine1 || profileData.city) {
            await this.updateCustomerAddress(customerName, {
              address_line1: profileData.addressLine1 || '',
              address_line2: profileData.addressLine2 || '',
              city: profileData.city || '',
              state: profileData.state || '',
              pincode: profileData.pincode || '',
              country: profileData.country || 'Slovakia'
            });
          }
          
          return {
            success: true,
            message: 'Profil bol úspešne aktualizovaný'
          };
        } else {
          return {
            success: false,
            message: 'Chyba pri aktualizácii kontaktných údajov'
          };
        }
      } else {
        // Create new primary contact if none exists
        const contactCreateData = {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          email_id: profileData.email,
          mobile_no: profileData.mobile || '',
          is_primary_contact: 1,
          links: [
            {
              link_doctype: 'Customer',
              link_name: customerName
            }
          ]
        };

        const contactCreateResponse = await this.client.post('/resource/Contact', contactCreateData);
        
        if (contactCreateResponse.status === 200) {
          return {
            success: true,
            message: 'Profil bol úspešne aktualizovaný (vytvorený nový kontakt)'
          };
        } else {
          return {
            success: false,
            message: 'Chyba pri vytváraní nového kontaktu'
          };
        }
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

  // Create or update address for customer in ERPNext
  private async updateCustomerAddress(customerName: string, addressData: {
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }): Promise<void> {
    try {
      console.log(`Updating address for customer: ${customerName}`);

      // First, try to find existing primary address for this customer
      let existingAddress = null;
      try {
        const customerResponse = await this.client.get(`/resource/Customer/${customerName}`);
        const customer = customerResponse.data.data;
        
        if (customer.customer_primary_address) {
          // Try to get the existing primary address
          const addressResponse = await this.client.get(`/resource/Address/${customer.customer_primary_address}`);
          if (addressResponse.data.data) {
            existingAddress = addressResponse.data.data;
            console.log('Found existing primary address:', existingAddress.name);
          }
        }
      } catch (error) {
        console.log('No existing primary address found, will create new one');
      }

      if (existingAddress) {
        // Update existing address
        console.log(`Updating existing address: ${existingAddress.name}`);
        const addressUpdateData = {
          address_line1: addressData.address_line1,
          address_line2: addressData.address_line2,
          city: addressData.city,
          state: addressData.state,
          pincode: addressData.pincode,
          country: addressData.country
        };

        await this.client.put(`/resource/Address/${existingAddress.name}`, addressUpdateData);
        console.log('Address updated successfully');
        
      } else {
        // Create new address
        console.log('Creating new address for customer:', customerName);
        
        // Fallback for city if empty - extract from address_line1 or use default
        let fallbackCity = addressData.city;
        if (!fallbackCity && addressData.address_line1) {
          // Try to extract city from address_line1 if it contains common Slovak city patterns
          const cityMatches = addressData.address_line1.match(/\b(Bratislava|Košice|Prešov|Žilina|Banská Bystrica|Nitra|Trnava|Martin|Trenčín|Poprad|Prievidza|Zvolen|Považská Bystrica|Nové Zámky|Michalovce|Spišská Nová Ves|Komárno|Levice|Humenné|Bardejov|Liptovský Mikuláš|Ružomberok|Dolný Kubín|Rimavská Sobota|Topoľčany|Gbely|Senica|Dunajská Streda|Galanta|Šaľa|Senec|Pezinok|Modra|Bojnice|Bojničky)\b/i);
          if (cityMatches) {
            fallbackCity = cityMatches[0];
            console.log(`Extracted city from address: ${fallbackCity}`);
          } else {
            fallbackCity = 'Neznáme';
            console.log('Using default city: Neznáme');
          }
        }

        const newAddressData = {
          address_title: `${customerName} - Adresa`,
          address_line1: addressData.address_line1,
          address_line2: addressData.address_line2,
          city: fallbackCity || 'Neznáme',
          state: addressData.state,
          pincode: addressData.pincode,
          country: addressData.country || 'Slovakia',
          is_primary_address: 1,
          is_shipping_address: 1,
          links: [
            {
              link_doctype: 'Customer',
              link_name: customerName
            }
          ]
        };

        const createResponse = await this.client.post('/resource/Address', newAddressData);
        if (createResponse.status === 200) {
          const newAddressName = createResponse.data.data.name;
          console.log('Address created successfully:', newAddressName);

          // Update customer to set this as primary address
          await this.client.put(`/resource/Customer/${customerName}`, {
            customer_primary_address: newAddressName
          });
          console.log('Customer primary address updated');
        }
      }
      
    } catch (error) {
      console.error('Error updating customer address:', error);
      // Don't throw error to prevent profile update from failing completely
    }
  }

  // Authenticate user via ERPNext login API
  async loginUser(credentials: { email: string; password: string }): Promise<{ success: boolean; data?: any; message: string }> {
    this.refreshClient();
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
      this.logError('Error logging in user to ERPNext:', error);
      
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
    this.refreshClient();
    try {
      const response = await this.client.get('/method/frappe.ping');
      return response.status === 200;
    } catch (error) {
      this.logError('ERPNext health check failed:', error);
      return false;
    }
  }

  // Načítanie atribútov pre torty na mieru z ERPNext
  async getCustomCakeAttributes(): Promise<CustomCakeAttribute[]> {
    this.refreshClient();
    try {
      console.log('Načítavam atribúty pre torty na mieru z ERPNext...');
      
      // Načítanie Item Attributes s filtrom cust_atribut_torta_na_mieru = 1
      const response = await this.client.get('/resource/Item Attribute', {
        params: {
          filters: JSON.stringify([['cust_atribut_torta_na_mieru', '=', 1]]),
          fields: JSON.stringify([
            'name',
            'attribute_name', 
            'numeric_values',
            'from_range',
            'to_range',
            'increment',
            'cust_atribut_torta_na_mieru'
          ])
        }
      });

      const erpAttributes: ERPNextItemAttribute[] = response.data.data || [];
      console.log(`Nájdené ${erpAttributes.length} atribúty pre torty na mieru`);

      // Pre každý atribút načítaj jeho hodnoty
      const customCakeAttributes: CustomCakeAttribute[] = [];
      
      for (const erpAttr of erpAttributes) {
        const customAttr: CustomCakeAttribute = {
          id: erpAttr.name,
          name: erpAttr.attribute_name,
          isNumeric: erpAttr.numeric_values || false,
          fromRange: erpAttr.from_range,
          toRange: erpAttr.to_range,
          increment: erpAttr.increment,
          values: []
        };

        // Pre textové atribúty načítaj hodnoty priamo z Item Attribute endpointu
        if (!erpAttr.numeric_values) {
          try {
            const detailResponse = await this.client.get(`/resource/Item Attribute/${erpAttr.name}`);
            const attributeDetail = detailResponse.data.data;
            
            if (attributeDetail && attributeDetail.item_attribute_values) {
              customAttr.values = attributeDetail.item_attribute_values.map((val: any) => ({
                attribute_value: val.attribute_value,
                abbreviation: val.abbr || val.abbreviation
              }));
              
              console.log(`Atribút ${erpAttr.attribute_name} má ${customAttr.values?.length || 0} hodnôt`);
            } else {
              console.log(`Atribút ${erpAttr.attribute_name} nemá definované hodnoty`);
              customAttr.values = [];
            }
          } catch (error) {
            console.error(`Chyba pri načítaní hodnôt atribútu ${erpAttr.attribute_name}:`, 
              axios.isAxiosError(error) ? `${error.response?.status} ${error.response?.statusText}` : error instanceof Error ? error.message : 'Neznáma chyba');
            customAttr.values = [];
          }
        }

        customCakeAttributes.push(customAttr);
      }

      console.log('Úspešne načítané atribúty pre torty na mieru:', customCakeAttributes.length);
      return customCakeAttributes;
      
    } catch (error) {
      console.error('Chyba pri načítaní atribútov pre torty na mieru:', 
        axios.isAxiosError(error) ? `${error.response?.status} ${error.response?.statusText}` : error instanceof Error ? error.message : 'Neznáma chyba');
      if (axios.isAxiosError(error)) {
        console.error('ERPNext API chyba:', error.response?.data);
      }
      throw new Error('Nepodarilo sa načítať atribúty pre torty na mieru');
    }
  }

  // Get sales invoices for customer
  async getSalesInvoicesForCustomer(customerName: string): Promise<ERPNextSalesInvoice[]> {
    this.refreshClient();
    try {
      console.log(`[sales-invoices] Fetching invoices for customer: ${customerName}`);
      
      const response = await this.client.get('/resource/Sales%20Invoice', {
        params: {
          fields: JSON.stringify([
            'name',
            'customer', 
            'posting_date',
            'due_date',
            'grand_total',
            'outstanding_amount',
            'status',
            'currency'
          ]),
          filters: JSON.stringify([
            ['Sales Invoice', 'customer', '=', customerName]
          ]),
          order_by: 'posting_date desc', // Najnovšie faktúry navrchu
          limit_page_length: 100 // Obmedzenie na 100 faktúr
        }
      });

      const invoices = response.data.data || [];
      console.log(`[sales-invoices] Found ${invoices.length} invoices for customer ${customerName}`);
      
      return invoices.map((invoice: any) => ({
        name: invoice.name,
        customer: invoice.customer,
        posting_date: invoice.posting_date,
        due_date: invoice.due_date,
        grand_total: parseFloat(invoice.grand_total) || 0,
        outstanding_amount: parseFloat(invoice.outstanding_amount) || 0,
        status: invoice.status,
        currency: invoice.currency || 'EUR'
      }));
      
    } catch (error) {
      console.error('Error fetching sales invoices from ERPNext:', error);
      return [];
    }
  }

  // Get all sales orders (for admin users)
  async getAllSalesOrders(): Promise<any[]> {
    this.refreshClient();
    try {
      console.log('[admin-orders] Fetching all sales orders');
      
      const response = await this.client.get('/resource/Sales%20Order', {
        params: {
          fields: JSON.stringify([
            'name', 'status', 'workflow_state', 'customer', 'customer_name', 
            'transaction_date', 'delivery_date', 'total', 'grand_total', 
            'currency', 'items', 'creation', 'modified_by'
          ]),
          order_by: 'creation desc',
          limit_page_length: 200 // Viac objednávok pre admina
        }
      });

      // Načítaj podrobnosti objednávok vrátane položiek
      const ordersWithItems = await Promise.all(
        response.data.data.map(async (order: any) => {
          try {
            // Načítaj podrobnosti objednávky vrátane položiek
            const orderDetails = await this.client.get(`/resource/Sales%20Order/${order.name}`);
            return orderDetails.data.data;
          } catch (error) {
            console.error(`Error fetching order details for ${order.name}:`, error);
            return order; // Vráť základné údaje ak sa nepodarí načítať podrobnosti
          }
        })
      );

      console.log(`[admin-orders] Found ${ordersWithItems.length} total orders`);
      return ordersWithItems;
    } catch (error) {
      console.error('Error fetching all sales orders from ERPNext:', error);
      return [];
    }
  }

  // Get all sales invoices (for admin users)
  async getAllSalesInvoices(): Promise<ERPNextSalesInvoice[]> {
    this.refreshClient();
    try {
      console.log('[admin-invoices] Fetching all sales invoices');
      
      const response = await this.client.get('/resource/Sales%20Invoice', {
        params: {
          fields: JSON.stringify([
            'name',
            'customer', 
            'posting_date',
            'due_date',
            'grand_total',
            'outstanding_amount',
            'status',
            'currency',
            'creation',
            'modified_by'
          ]),
          order_by: 'posting_date desc', // Najnovšie faktúry navrchu
          limit_page_length: 200 // Viac faktúr pre admina
        }
      });

      const invoices = response.data.data || [];
      console.log(`[admin-invoices] Found ${invoices.length} total invoices`);
      
      return invoices.map((invoice: any) => ({
        name: invoice.name,
        customer: invoice.customer,
        posting_date: invoice.posting_date,
        due_date: invoice.due_date,
        grand_total: parseFloat(invoice.grand_total) || 0,
        outstanding_amount: parseFloat(invoice.outstanding_amount) || 0,
        status: invoice.status,
        currency: invoice.currency || 'EUR'
      }));
      
    } catch (error) {
      console.error('Error fetching all sales invoices from ERPNext:', error);
      return [];
    }
  }

  // Get company's bank account IBAN
  async getCompanyBankAccount(companyName: string): Promise<string | null> {
    this.refreshClient();
    try {
      // Try to get bank account information from Company doctype
      const response = await this.client.get('/resource/Company/' + encodeURIComponent(companyName));
      const company = response.data.data;
      
      // Check if company has bank account information
      if (company.default_bank_account) {
        try {
          // Get bank account details
          const bankResponse = await this.client.get('/resource/Bank%20Account/' + encodeURIComponent(company.default_bank_account));
          const bankAccount = bankResponse.data.data;
          if (bankAccount.iban || bankAccount.bank_account_no) {
            const ibanValue = bankAccount.iban || bankAccount.bank_account_no;
            console.log(`[qr-payment] Found company IBAN: ${ibanValue}`);
            return ibanValue;
          }
        } catch (bankError) {
          console.warn(`[qr-payment] Could not fetch bank account details:`, bankError);
        }
      }

      // Alternative: Check for custom field with IBAN directly on company
      if (company.custom_iban) {
        console.log(`[qr-payment] Found custom IBAN field: ${company.custom_iban}`);
        return company.custom_iban;
      }

      // Try to search for bank accounts by company
      try {
        console.log(`[qr-payment] Searching for bank accounts for company: ${companyName}`);
        const searchResponse = await this.client.get('/resource/Bank%20Account', {
          params: {
            filters: JSON.stringify([['company', '=', companyName]]),
            fields: JSON.stringify(['name', 'bank_account_no', 'iban', 'company', 'account_name'])
          }
        });
        
        const bankAccounts = searchResponse.data.data || [];
        console.log(`[qr-payment] Found ${bankAccounts.length} bank accounts for company ${companyName}:`, bankAccounts);
        
        // Use the first bank account with an IBAN
        for (const account of bankAccounts) {
          if (account.iban || account.bank_account_no) {
            const ibanValue = account.iban || account.bank_account_no;
            console.log(`[qr-payment] Using bank account: ${account.name} with IBAN: ${ibanValue}`);
            return ibanValue;
          }
        }
      } catch (searchError) {
        console.warn(`[qr-payment] Could not search bank accounts:`, searchError);
      }

      // Try specific bank account names for DEMO - Glam cake s. r. o.
      const bankAccountNames = [
        'DEMO TB',  // From user's screenshot
        '221 - 221 - Bankové účty - D-Gcsro',  // Original attempt
        'DEMO TB - Tatra Banka, a.s.'  // Alternative
      ];

      for (const accountName of bankAccountNames) {
        try {
          console.log(`[qr-payment] Trying bank account: ${accountName}`);
          const bankResponse = await this.client.get('/resource/Bank%20Account/' + encodeURIComponent(accountName));
          const bankAccount = bankResponse.data.data;
          
          // Check if this bank account belongs to our company
          if (bankAccount.company === companyName && (bankAccount.iban || bankAccount.bank_account_no)) {
            const ibanValue = bankAccount.iban || bankAccount.bank_account_no;
            console.log(`[qr-payment] Found matching bank account: ${accountName} with IBAN: ${ibanValue}`);
            return ibanValue;
          }
        } catch (bankError) {
          console.log(`[qr-payment] Bank account ${accountName} not found, trying next...`);
        }
      }

      console.error(`[qr-payment] No bank account found for company: ${companyName}`);
      return null;
    } catch (error) {
      console.warn(`[qr-payment] Could not fetch company bank details:`, error);
      return null;
    }
  }

  // Get QR payment details for bank transfer payments
  async getQRPaymentDetails(salesOrderId: string): Promise<{
    qr_code?: string;
    iban: string;
    company_name: string;
    variable_symbol: string;
  } | null> {
    this.refreshClient();
    try {
      console.log(`[qr-payment] Fetching QR payment details for Sales Order: ${salesOrderId}`);
      
      // Get the Sales Order to access QR code and company details
      const salesOrder = await this.getSalesOrderById(salesOrderId);
      if (!salesOrder) {
        console.error(`[qr-payment] Sales Order ${salesOrderId} not found`);
        return null;
      }

      // Get company information - MUST be from ERPNext
      const companyName = salesOrder.company;
      if (!companyName) {
        console.error(`[qr-payment] No company name found in Sales Order ${salesOrderId}`);
        return null;
      }
      
      // Get IBAN from ERPNext Company doctype - MUST be from ERPNext
      const iban = await this.getCompanyBankAccount(companyName);
      if (!iban) {
        console.error(`[qr-payment] No IBAN found in ERPNext for company: ${companyName}`);
        return null;
      }
      
      // Use Sales Order name as variable symbol (order number)
      const variableSymbol = salesOrder.name;

      // Get QR code from Sales Order custom field (if available)
      // In ERPNext, this would typically be stored in a custom field like 'custom_qr_code'
      const qrCode = salesOrder.custom_qr_code || undefined;

      console.log(`[qr-payment] Generated payment details for ${salesOrderId}:`, {
        company_name: companyName,
        iban: iban,
        variable_symbol: variableSymbol,
        qr_code: qrCode ? 'Available' : 'Not available'
      });

      return {
        qr_code: qrCode,
        iban: iban,
        company_name: companyName,
        variable_symbol: variableSymbol
      };
      
    } catch (error) {
      console.error(`[qr-payment] Error fetching QR payment details for ${salesOrderId}:`, error);
      return null;
    }
  }

  // Update order status in ERPNext
  async updateOrderStatus(orderId: string, newStatus: string): Promise<{ success: boolean; error?: string }> {
    this.refreshClient();
    try {
      console.log(`[update-order-status] Updating order ${orderId} to status: ${newStatus}`);
      
      // First get the current order to check if it exists
      const orderResponse = await this.client.get(`/resource/Sales%20Order/${orderId}`);
      
      if (!orderResponse.data.data) {
        return { success: false, error: 'Objednávka nebola nájdená' };
      }

      // Update the workflow_state field
      const updateData = {
        workflow_state: newStatus
      };

      await this.client.put(`/resource/Sales%20Order/${orderId}`, updateData);
      
      console.log(`[update-order-status] Successfully updated order ${orderId} to status: ${newStatus}`);
      return { success: true };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Nepodarilo sa zmeniť stav objednávky' 
      };
    }
  }
}

export const erpNextService = new ERPNextService();