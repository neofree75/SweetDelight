import axios, { AxiosInstance } from 'axios';
import { 
  ERPNextItem, 
  ERPNextItemVariant, 
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
          fields: '["name","item_name","description","item_group","stock_uom","is_stock_item","disabled","image","valuation_rate","has_variants","variant_of","attributes"]',
          filters: '[["disabled","=","0"]]',
          limit_page_length: 100
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching items from ERPNext:', error);
      return [];
    }
  }

  // Get variants for a specific item template
  async getItemVariants(templateName: string): Promise<ERPNextItemVariant[]> {
    try {
      console.log(`Debug: Fetching variants for template: ${templateName}`);
      const response = await this.client.get('/resource/Item', {
        params: {
          fields: '["name","item_name","description","variant_of","attributes","valuation_rate","disabled"]',
          filters: `[["variant_of","=","${templateName}"],["disabled","=","0"]]`,
          limit_page_length: 50
        }
      });

      const variants = response.data.data || [];
      console.log(`Debug: Found ${variants.length} variants for ${templateName}:`, variants.map((v: any) => ({ name: v.name, item_name: v.item_name, attributes: v.attributes })));
      return variants;
    } catch (error) {
      console.error(`Error fetching variants for ${templateName}:`, error);
      return [];
    }
  }


  // Search for existing customer by email
  async findCustomerByEmail(email: string): Promise<{customerId: string; needsGroupUpdate: boolean} | null> {
    try {
      // Normalize email (trim and lowercase)
      const normalizedEmail = email.trim().toLowerCase();
      
      const response = await this.client.get('/resource/Customer', {
        params: {
          fields: '["name","customer_name","email_id","customer_group"]',
          filters: `[["email_id","=","${normalizedEmail}"]]`,
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
      console.error('Error searching for customer in ERPNext:', error);
      return null;
    }
  }

  // Update customer's group in ERPNext
  async updateCustomerGroup(customerId: string, customerGroup: string): Promise<boolean> {
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
    try {
      const response = await this.client.post('/resource/Customer', customerData);

      return response.data.data.name;
    } catch (error) {
      console.error('Error creating customer in ERPNext:', error);
      return null;
    }
  }

  // Find or create customer in ERPNext
  async findOrCreateCustomer(customerData: Omit<ERPNextCustomer, 'name'>): Promise<string | null> {
    // Najprv sa pokús nájsť existujúceho zákazníka
    if (customerData.email_id) {
      const normalizedEmail = customerData.email_id.trim().toLowerCase();
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
    }

    // Ak zákazník neexistuje, vytvor nového s normalizovaným emailom
    const normalizedCustomerData = {
      ...customerData,
      email_id: customerData.email_id?.trim().toLowerCase()
    };
    
    return await this.createCustomer(normalizedCustomerData);
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

  // Clear product cache
  async clearProductCache(): Promise<void> {
    this.productCache = null;
    console.log('Product cache cleared');
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
    const products = await Promise.all(items.map(async item => {
      // Oprav image URL - pridaj ERPNext base URL pre obrázky
      let imageUrl = '/placeholder-product.jpg';
      if (item.image && item.image.startsWith('/files/')) {
        imageUrl = `${this.baseUrl}${item.image}`;
      } else if (item.image) {
        imageUrl = item.image;
      }

      // Ak má produkt varianty, načítaj ich
      let variants = undefined;
      console.log(`Debug: Checking variants for ${item.name}, has_variants: ${item.has_variants}`);
      if (item.has_variants === true || item.has_variants === 1) {
        console.log(`Debug: Product ${item.name} has variants, loading them...`);
        const itemVariants = await this.getItemVariants(item.name);
        variants = itemVariants.map(variant => ({
          id: variant.name,
          name: variant.item_name,
          attributes: (variant.attributes || []).map(attr => ({
            attribute: attr.attribute,
            value: attr.attribute_value || ''
          })),
          price: variant.valuation_rate || 0
        }));
        console.log(`Debug: Mapped ${variants.length} variants for ${item.name}`);
      }

      return {
        id: item.name,
        name: item.item_name,
        description: item.description || '',
        price: item.valuation_rate || 0,
        image: imageUrl,
        category: item.item_group,
        inStock: !item.disabled,
        hasVariants: item.has_variants || false,
        variants: variants
      };
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

  // Register user in ERPNext
  async registerUser(userData: {
    email: string;
    first_name: string;
    last_name: string;
    mobile_no?: string;
  }): Promise<{ success: boolean; message: string }> {
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

  // Get user profile data from ERPNext (Customer + primary Contact)
  async getUserProfile(email: string): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      console.log('Getting user profile for:', email);
      
      // Get basic customer data from ERPNext with primary address
      const customerFields = [
        "name", "customer_name", "email_id", 
        "customer_group", "territory", "creation", "modified", "customer_type",
        "customer_primary_address"
      ];
      
      const customerResponse = await this.client.get(`/resource/Customer?filters=[["email_id","=","${email}"]]&fields=${JSON.stringify(customerFields)}`);
      
      if (customerResponse.data.data && customerResponse.data.data.length > 0) {
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
            const addressListResponse = await this.client.get(`/resource/Address?filters=[["link_doctype","=","Customer"],["link_name","=","${customer.name}"]]&fields=["name","address_line1","address_line2","city","state","pincode","country"]&limit_page_length=1`);
            if (addressListResponse.data.data && addressListResponse.data.data.length > 0) {
              primaryAddress = addressListResponse.data.data[0];
              console.log('Fallback address found:', primaryAddress.name);
            }
          } catch (fallbackError) {
            console.warn('Error fetching fallback address:', fallbackError);
          }
        }

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
            addressId: primaryAddress?.name || ''
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

  // Update user profile data in ERPNext (Customer + primary Contact)
  async updateUserProfile(email: string, profileData: { firstName: string; lastName: string; email: string; mobile?: string }): Promise<{ success: boolean; message: string }> {
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