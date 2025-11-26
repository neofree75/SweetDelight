import type { Express, Request } from "express";
import type { Session } from "express-session";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { erpNextService } from "./erpnext-service";
import { 
  insertCustomerSchema, 
  insertOrderSchema,
  cartItemSchema,
  userOrderSchema,
  invoiceSchema,
  insertGalleryImageSchema,
  updateGalleryImageSchema,
  type CartItem,
  type Product,
  type ERPNextCustomer,
  type ERPNextSalesOrder,
  type UserOrder,
  type Invoice,
  type InsertOrder,
  type GalleryImage,
  type InsertGalleryImage,
  type UpdateGalleryImage
} from "@shared/schema";
import { z } from "zod";


export async function registerRoutes(app: Express): Promise<Server> {
  console.log('[registerRoutes] Registering API routes...');
  const erpCompany = process.env.ERPNEXT_COMPANY || 'Glam cake s. r. o.';
  const erpDefaultWarehouse = process.env.ERPNEXT_DEFAULT_WAREHOUSE || 'Hotový tovar - Gcsro';
  const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  
  // Simple test endpoint that should always work
  app.get("/api/test", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "API routes are working!",
      timestamp: new Date().toISOString(),
      path: req.path
    });
  });
  
  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      const erpNextHealth = await erpNextService.healthCheck();
      res.json({ 
        status: "ok", 
        erpnext: erpNextHealth ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Health check failed" });
    }
  });

  // Debug endpoint - check ERPNext config (safe for production)
  app.get("/api/debug/config", async (req, res) => {
    try {
      const hasUrl = !!process.env.ERPNEXT_URL;
      const hasApiKey = !!process.env.ERPNEXT_API_KEY;
      const hasApiSecret = !!process.env.ERPNEXT_API_SECRET;
      const urlPreview = process.env.ERPNEXT_URL ? 
        (process.env.ERPNEXT_URL.length > 30 ? process.env.ERPNEXT_URL.substring(0, 30) + '...' : process.env.ERPNEXT_URL) : 
        'NOT SET';
      
      const validation = await erpNextService.validateCredentials();
      const itemsCount = await erpNextService.getItems().then(items => items.length).catch(() => 0);
      
      res.json({
        environment: process.env.NODE_ENV || 'unknown',
        erpnext: {
          urlSet: hasUrl,
          urlPreview: urlPreview,
          apiKeySet: hasApiKey,
          apiSecretSet: hasApiSecret,
          validation: validation,
          itemsCount: itemsCount
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: "Config check failed",
        message: error.message
      });
    }
  });

  // Get products from ERPNext
  app.get("/api/products", async (req, res) => {
    try {
      // CRITICAL: Set JSON content type and disable caching
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      console.log(`[api/products] Request from: ${req.get('host')}, Environment: ${process.env.NODE_ENV}`);
      console.log(`[api/products] ERPNext URL: ${process.env.ERPNEXT_URL ? 'SET' : 'NOT SET'}`);
      console.log(`[api/products] Request path: ${req.path}, Original URL: ${req.originalUrl}`);
      
      const products = await erpNextService.getProductsForFrontend();
      console.log(`[api/products] Returning ${products.length} products to ${req.get('host')}`);
      
      if (products.length === 0) {
        console.warn(`[api/products] WARNING: No products returned! Check ERPNext connection.`);
        // Return empty array instead of error, so frontend can handle it gracefully
        return res.json([]);
      }
      
      // Ensure we're sending JSON, not HTML
      res.json(products);
    } catch (error: any) {
      console.error("[api/products] Error fetching products:", error);
      console.error("[api/products] Error stack:", error.stack);
      
      // Ensure error response is also JSON
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        error: "Failed to fetch products",
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Get specific product by ID
  app.get("/api/products/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      const product = await erpNextService.getProductById(productId);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Debug endpoint - get products without cache
  app.get("/api/debug/products", async (req, res) => {
    try {
      // Získaj produkty priamo z ERPNext bez cache
      const items = await erpNextService.getItems();
      console.log(`Debug: Fetched ${items.length} items from ERPNext:`, items.map(i => ({ name: i.name, item_name: i.item_name, item_group: i.item_group, disabled: i.disabled })));
      
      res.json({
        total: items.length,
        items: items,
        categories: Array.from(new Set(items.map(i => i.item_group))).sort()
      });
    } catch (error) {
      console.error("Error fetching debug products:", error);
      res.status(500).json({ error: "Failed to fetch debug products" });
    }
  });

  // Debug endpoint - test Website Items directly
  app.get("/api/debug/website-items", async (req, res) => {
    try {
      // Načítaj Website Items cez axios priamo
      const axios = (await import('axios')).default;
      const baseUrl = process.env.ERPNEXT_URL || '';
      const apiKey = process.env.ERPNEXT_API_KEY || '';
      const apiSecret = process.env.ERPNEXT_API_SECRET || '';
      
      const client = axios.create({
        baseURL: baseUrl ? `${baseUrl}/api` : '',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${apiKey}:${apiSecret}`
        },
        timeout: 10000
      });
      
      // Test Website Items API - používame URL encoding
      const websiteItemsResponse = await client.get('/resource/Website%20Item', {
        params: {
          fields: JSON.stringify(["name", "item_code", "published", "route", "website_image", "description", "web_item_name"]),
          filters: JSON.stringify([["published", "=", 1]]),
          limit_page_length: 100
        }
      });

      const websiteItems = websiteItemsResponse.data.data || [];
      
      res.json({
        total: websiteItems.length,
        websiteItems: websiteItems,
        sample: websiteItems.slice(0, 5).map((wi: any) => ({
          name: wi.name,
          item_code: wi.item_code,
          published: wi.published,
          web_item_name: wi.web_item_name,
          description: wi.description,
          website_image: wi.website_image
        }))
      });
    } catch (error: any) {
      console.error("Error fetching Website Items:", error);
      res.status(500).json({ 
        error: "Failed to fetch Website Items",
        message: error.message,
        details: error.response?.data,
        status: error.response?.status
      });
    }
  });

  // Debug endpoint - refresh products cache
  app.post("/api/debug/refresh-cache", async (req, res) => {
    try {
      // Vynuluj cache
      await erpNextService.clearProductCache();
      console.log("Debug: Product cache cleared");
      
      // Načítaj nové produkty
      const products = await erpNextService.getProductsForFrontend();
      console.log(`Debug: Refreshed cache with ${products.length} products`);
      
      res.json({
        message: "Product cache refreshed",
        total: products.length,
        products: products
      });
    } catch (error) {
      console.error("Error refreshing product cache:", error);
      res.status(500).json({ error: "Failed to refresh cache" });
    }
  });

  // Debug endpoint - check ERPNext connection
  app.get("/api/debug/erpnext", async (req, res) => {
    try {
      const validation = await erpNextService.validateCredentials();
      const isHealthy = await erpNextService.healthCheck();
      
      res.json({
        credentialsValid: validation.valid,
        credentialError: validation.error || null,
        healthCheck: isHealthy,
        config: {
          hasUrl: !!process.env.ERPNEXT_URL,
          hasApiKey: !!process.env.ERPNEXT_API_KEY,
          hasApiSecret: !!process.env.ERPNEXT_API_SECRET,
          hasCompany: !!process.env.ERPNEXT_COMPANY
        }
      });
    } catch (error) {
      console.error("Error checking ERPNext connection:", error);
      res.status(500).json({ 
        error: "Failed to check ERPNext connection",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get custom cake attributes for torty na mieru
  app.get("/api/custom-cake-attributes", async (req, res) => {
    try {
      const attributes = await erpNextService.getCustomCakeAttributes();
      res.json(attributes);
    } catch (error) {
      console.error("Error fetching custom cake attributes:", error);
      res.status(500).json({ error: "Failed to fetch custom cake attributes" });
    }
  });

  app.get("/api/website-items/:websiteItemId", async (req, res) => {
    try {
      let { websiteItemId } = req.params;
      if (!websiteItemId) {
        return res.status(400).json({ error: "Website Item ID is required" });
      }

      // Odstráň variant ID ak je prítomný (napr. "WEB-ITM-0004:1" -> "WEB-ITM-0004")
      // ERPNext môže vracať varianty s dvojbodkou, ale pre Website Item potrebujeme základný názov
      if (websiteItemId.includes(':')) {
        websiteItemId = websiteItemId.split(':')[0];
        console.log(`[website-items] Removed variant suffix, using: ${websiteItemId}`);
      }

      console.log(`[website-items] Fetching Website Item: ${websiteItemId}`);
      const websiteItem = await erpNextService.getWebsiteItemByName(websiteItemId);
      if (!websiteItem) {
        console.log(`[website-items] Website Item ${websiteItemId} not found`);
        return res.status(404).json({ error: "Website Item not found", itemId: websiteItemId });
      }

      res.json(websiteItem);
    } catch (error: any) {
      console.error("Error fetching website item:", error);
      res.status(500).json({ error: "Failed to fetch website item", message: error.message });
    }
  });

  // Cart management
  app.get("/api/cart", async (req, res) => {
    try {
      const sessionId = req.sessionID;
      const cartItems = await storage.getCartItems(sessionId);
      res.json(cartItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const sessionId = req.sessionID;
      const items = z.array(cartItemSchema).parse(req.body);
      await storage.updateCartItems(sessionId, items);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating cart:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid cart data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update cart" });
      }
    }
  });

  app.delete("/api/cart", async (req, res) => {
    try {
      const sessionId = req.sessionID;
      await storage.clearCart(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  // Order management
  app.post("/api/orders", async (req, res) => {
    try {
      console.log("Creating order with data:", JSON.stringify(req.body, null, 2));
      
      // Validácia vstupných údajov
      const orderValidation = insertOrderSchema.safeParse(req.body);
      if (!orderValidation.success) {
        console.error("Order validation failed:", orderValidation.error.errors);
        return res.status(400).json({ 
          error: "Invalid order data", 
          details: orderValidation.error.errors 
        });
      }

      const orderData = orderValidation.data;
      
      // Skontroluj že objednávka má položky
      if (!orderData.items || orderData.items.length === 0) {
        return res.status(400).json({ error: "Order must contain at least one item" });
      }

      // Validácia minimálneho množstva pre každú položku
      const products = await erpNextService.getProductsForFrontend();
      for (const orderItem of orderData.items) {
        let productToValidate = null;
        let productName = orderItem.name;

        // Detekuj torty na mieru a použij TORTCUS001 pre validáciu
        const isCustomCake = orderItem.id.startsWith('custom-cake-');
        
        if (isCustomCake) {
          // Pre torty na mieru načítaj TORTCUS001 priamo z ERPNext (nie je v cache kvôli filtringu)
          productToValidate = await erpNextService.getProductById("TORTCUS001");
          if (!productToValidate) {
            console.error("TORTCUS001 product not found for custom cake validation");
            return res.status(500).json({ 
              error: "Systémová chyba: Nie je možné validovať tortu na mieru" 
            });
          }
          productName = "Torta na mieru";
        } else {
          // Pre bežné produkty najprv skús nájsť hlavný produkt
          productToValidate = products.find(p => p.id === orderItem.id);
          
          // Ak hlavný produkt nebol nájdený, skús nájsť vo variantoch
          if (!productToValidate) {
            for (const product of products) {
              if (product.hasVariants && product.variants) {
                const variant = product.variants.find(v => v.id === orderItem.id);
                if (variant) {
                  // Pre varianty použij minOrderQuantity z variantu, ak existuje
                  productToValidate = {
                    id: variant.id,
                    name: variant.name,
                    minOrderQuantity: variant.minOrderQuantity,
                    // Ostatné vlastnosti nie sú potrebné pre validáciu
                    price: 0,
                    description: "",
                    image: "",
                    category: "",
                    inStock: true,
                    hasVariants: false
                  };
                  productName = variant.name;
                  break;
                }
              }
            }
          }
        }

        // Skontroluj minimálne množstvo ak bol produkt nájdený
        if (productToValidate && productToValidate.minOrderQuantity) {
          if (orderItem.quantity < productToValidate.minOrderQuantity) {
            const errorMessage = isCustomCake 
              ? `Minimálne množstvo pre tortu na mieru je ${productToValidate.minOrderQuantity} kus. Aktuálne množstvo: ${orderItem.quantity}`
              : `Minimálne množstvo pre ${productName} je ${productToValidate.minOrderQuantity} kusov. Aktuálne množstvo: ${orderItem.quantity}`;
              
            return res.status(400).json({ 
              error: errorMessage
            });
          }
        } else if (!isCustomCake) {
          // Pre bežné produkty (nie torty na mieru) log warning ak produkt nebol nájdený
          console.warn(`Product with ID ${orderItem.id} not found in product list for minimum quantity validation`);
        }
      }

      // 1. Vytvor zákazníka v ERPNext
      let customerId: string | null;
      try {
        console.log("Creating customer:", orderData.customerInfo);
        customerId = await erpNextService.findOrCreateCustomer({
          customer_name: orderData.customerInfo.name,
          customer_type: "Individual",
          customer_group: "Internetový predaj",
          territory: "Slovakia",
          email_id: orderData.customerInfo.email,
          mobile_no: orderData.customerInfo.phone
        });
        
        if (!customerId) {
          throw new Error("Failed to create customer in ERPNext");
        }
        
        console.log("Customer created:", customerId);
      } catch (error) {
        console.error("Error creating customer:", error);
        return res.status(500).json({ 
          error: "Failed to create customer", 
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }

      // 2. Vytvor Sales Order v ERPNext
      try {
        console.log("Creating sales order for customer:", customerId);
        
        const salesOrderItems = orderData.items.map(item => {
          // Pre torty na mieru použij generický kód položky
          const isCustomCake = item.id.startsWith('custom-cake-');
          
          return {
            item_code: isCustomCake ? "TORTCUS001" : item.id,
            item_name: item.name,
            qty: item.quantity,
            rate: item.price,
            amount: item.quantity * item.price,
            stock_uom: "Nos",
            parentfield: "items",
            description: item.additional_notes || item.name
          };
        });

        const salesOrderId = await erpNextService.createSalesOrder({
          customer: customerId,
          company: erpCompany,
          delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
          transaction_date: new Date().toISOString().split('T')[0],
          items: salesOrderItems.map((item) => ({
            ...item,
            warehouse: erpDefaultWarehouse
          })),
          total: orderData.total,
          grand_total: orderData.total,
          currency: "EUR",
          set_warehouse: erpDefaultWarehouse
        });

        if (!salesOrderId) {
          throw new Error("Failed to create sales order in ERPNext");
        }

        console.log("Sales order created:", salesOrderId);

        // Clear cart after successful order
        const sessionId = req.sessionID;
        await storage.clearCart(sessionId);

        // Return success response
        res.status(201).json({
          orderId: salesOrderId,
          erpNextOrderId: salesOrderId,
          customerId: customerId,
          message: "Order created successfully"
        });

      } catch (error) {
        console.error("Error creating sales order:", error);
        return res.status(500).json({ 
          error: "Failed to create sales order", 
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }

    } catch (error) {
      console.error("Unexpected error creating order:", error);
      res.status(500).json({ 
        error: "Unexpected error creating order",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get user's orders (requires authentication)
  app.get("/api/orders", async (req, res) => {
    try {
      // Skontroluj či je užívateľ prihlásený
      const session = req.session as Session & { user?: any };
      if (!session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userEmail = session.user.email;
      console.log("Fetching orders for user:", userEmail);

      // Find customer by email first
      const customer = await erpNextService.findCustomerByEmail(userEmail);
      if (!customer) {
        return res.json({ orders: [], customer: null });
      }

      // Získaj objednávky z ERPNext pre tohto zákazníka
      const orders = await erpNextService.getOrdersByCustomer(customer.customerId);
      
      res.json({ orders, customer: { id: customer.customerId } });
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Get specific order details
  app.get("/api/orders/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // Skontroluj či je užívateľ prihlásený
      const session = req.session as Session & { user?: any };
      if (!session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log("Fetching order details for:", orderId);
      
      // Získaj detaily objednávky z ERPNext
      const orders = await erpNextService.getOrdersByCustomer("");
      const order = orders.find(o => o.name === orderId);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Skontroluj či objednávka patrí tomuto užívateľovi
      const userEmail = session.user.email;
      if (order.contact_email !== userEmail) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(order);
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ error: "Failed to fetch order details" });
    }
  });

  // User authentication routes
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log('Logging in user:', email);
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Use ERPNext login service
      const loginResult = await erpNextService.loginUser({ email, password });
      
      if (!loginResult.success) {
        return res.status(401).json({ 
          error: "Invalid credentials",
          message: loginResult.message 
        });
      }

      // Ulož užívateľa do session
      const session = req.session as Session & { user?: any };
      session.user = loginResult.data;

      // Get complete user profile with admin status
      console.log(`[login] Fetching user profile for: ${email}`);
      const profileResult = await erpNextService.getUserProfile(email);
      console.log(`[login] Profile result:`, { success: profileResult.success, hasData: !!profileResult.data, message: profileResult.message });
      console.log(`[login] Profile data keys:`, profileResult.data ? Object.keys(profileResult.data) : 'NO DATA');
      
      if (profileResult.success && profileResult.data) {
        // Merge login data with profile data (including admin status)
        const completeUserData = {
          ...session.user,
          ...profileResult.data
        };
        session.user = completeUserData;
        
        console.log(`[login] Session user before response:`, { 
          email: session.user?.email, 
          isAdmin: session.user?.isAdmin, 
          userType: session.user?.userType,
          keys: Object.keys(session.user || {})
        });
        console.log(`[login] Complete user data:`, { 
          email: completeUserData?.email, 
          isAdmin: completeUserData?.isAdmin, 
          userType: completeUserData?.userType,
          keys: Object.keys(completeUserData || {})
        });
        
        // Force session save
        session.save((err) => {
          if (err) {
            console.log(`[login] Session save error:`, err);
          } else {
            console.log(`[login] Session saved successfully`);
          }
        });
        
        res.json({
          success: true,
          user: completeUserData,
          message: loginResult.message
        });
      } else {
        // Fallback if profile fetch fails
        console.log(`[login] Profile fetch failed, using fallback data. Error:`, profileResult.message);
        console.log(`[login] Fallback session user:`, { 
          email: session.user?.email, 
          isAdmin: session.user?.isAdmin, 
          userType: session.user?.userType,
          keys: Object.keys(session.user || {})
        });
        res.json({
          success: true,
          user: session.user,
          message: loginResult.message
        });
      }

    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // User registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { email, firstName, lastName, mobile } = req.body;
      console.log('Registering new user:', email, 'with mobile:', mobile);
      
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ 
          error: "All fields are required",
          message: "Email, meno a priezvisko sú povinné"
        });
      }

      // Validácia emailu
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: "Invalid email format",
          message: "Neplatný formát emailu"
        });
      }

      // Use ERPNext registration service
      const registrationResult = await erpNextService.registerUser({
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        mobile_no: mobile || '' // Použi mobilné číslo ak je zadané
      });
      
      if (!registrationResult.success) {
        return res.status(400).json({ 
          error: "Registration failed",
          message: registrationResult.message
        });
      }

      res.json({
        success: true,
        message: `${registrationResult.message} Používateľovi boli odoslané emaily s podrobnými informáciami o vytvorení hesla.`
      });

    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ 
        error: "Registration failed",
        message: "Chyba pri registrácii"
      });
    }
  });

  app.post("/api/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ error: "Logout failed" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Request password reset
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      console.log('Requesting password reset for:', email);
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Validácia emailu
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const resetResult = await erpNextService.requestPasswordReset(email);
      
      res.json({
        success: resetResult.success,
        message: resetResult.message
      });

    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ 
        error: "Failed to process password reset request",
        message: "Chyba pri spracovaní požiadavky na obnovenie hesla"
      });
    }
  });

  // Update password using frontend token
  app.post("/api/update-password-frontend", async (req, res) => {
    try {
      const { token, new_password } = req.body;
      console.log('Updating password with frontend token');
      
      if (!token || !new_password) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      // Validácia hesla
      if (new_password.length < 8) {
        return res.status(400).json({ 
          error: "Password too short",
          message: "Heslo musí mať aspoň 8 znakov"
        });
      }

      const updateResult = await erpNextService.updatePasswordFrontend({ 
        token, 
        new_password 
      });
      
      if (!updateResult.success) {
        return res.status(400).json({ 
          error: "Password update failed",
          message: updateResult.message
        });
      }

      res.json({
        success: true,
        message: updateResult.message
      });

    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ 
        error: "Failed to update password",
        message: "Chyba pri zmene hesla"
      });
    }
  });

  // Legacy reset password route (for existing key/user flow)
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { key, user, newPassword } = req.body;
      console.log('Legacy password reset for user:', user);
      
      if (!key || !user || !newPassword) {
        return res.status(400).json({ error: "Key, user, and new password are required" });
      }

      // Validácia hesla
      if (newPassword.length < 8) {
        return res.status(400).json({ 
          error: "Password too short",
          message: "Heslo musí mať aspoň 8 znakov"
        });
      }

      const updateResult = await erpNextService.updateUserPassword({ 
        key, 
        user, 
        new_password: newPassword 
      });
      
      if (!updateResult.success) {
        return res.status(400).json({ 
          error: "Password update failed",
          message: updateResult.message
        });
      }

      res.json({
        success: true,
        message: updateResult.message
      });

    } catch (error) {
      console.error("Error with legacy password reset:", error);
      res.status(500).json({ 
        error: "Failed to reset password",
        message: "Chyba pri zmene hesla"
      });
    }
  });

  // Get user profile
  app.get("/api/profile", async (req, res) => {
    try {
      const session = req.session as Session & { user?: any };
      console.log(`[profile] Session check:`, { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        sessionId: session?.id,
        userEmail: session?.user?.email
      });
      
      if (!session.user) {
        console.log(`[profile] No user in session, returning 401`);
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userEmail = session.user.email;
      const profileResult = await erpNextService.getUserProfile(userEmail);
      
      if (!profileResult.success || !profileResult.data) {
        console.log(`[profile] Falling back to session user data for ${userEmail}: ${profileResult.message}`);
        const fallbackData = {
          firstName: session.user?.firstName || '',
          lastName: session.user?.lastName || '',
          email: session.user?.email || userEmail,
          customerName: session.user?.customerName || session.user?.name || '',
          customerId: session.user?.customerId || '',
          mobile: session.user?.mobile || '',
          phone: session.user?.phone || '',
          customerGroup: session.user?.customerGroup || '',
          territory: session.user?.territory || '',
          customerType: session.user?.customerType || '',
          contactId: session.user?.contactId || '',
          addressId: session.user?.addressId || '',
          isAdmin: session.user?.isAdmin || false,
          userType: session.user?.userType || 'Website User'
        };

        return res.json({
          success: true,
          data: fallbackData,
          fallback: true,
          message: profileResult.message
        });
      }

      res.json({
        success: true,
        data: profileResult.data
      });
    } catch (error) {
      console.error("Error getting user profile:", error);
      res.status(500).json({ error: "Failed to get user profile" });
    }
  });

  // Update user profile
  app.put("/api/profile", async (req, res) => {
    try {
      const session = req.session as Session & { user?: any };
      if (!session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const {
        email,
        firstName,
        lastName,
        mobile,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        country,
        salutation,
        gender,
        taxId,
        customerType,
        ico,
        icDph,
        zapisVOrsr
      } = req.body;

      const userEmail = session.user.email;
      console.log('Updating profile for user:', userEmail);

      // Call ERPNext service to update profile
      const updateResult = await erpNextService.updateUserProfile(userEmail, {
        firstName: firstName || '',
        lastName: lastName || '',
        email: email || userEmail,
        mobile: mobile,
        addressLine1: addressLine1,
        addressLine2: addressLine2,
        city: city,
        state: state,
        pincode: pincode,
        country: country,
        customerType: customerType,
        taxId: taxId,
        ico: ico,
        icDph: icDph,
        zapisVOrsr: zapisVOrsr
      });

      if (!updateResult.success) {
        return res.status(400).json({ error: updateResult.message });
      }

      res.json({
        success: true,
        message: updateResult.message
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });

  // Get user orders
  app.get("/api/user-orders", async (req, res) => {
    try {
      const session = req.session as Session & { user?: any };
      if (!session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userEmail = session.user.email;
      const isAdmin = session.user.userType === "System User";
      console.log('[user-orders] Fetching orders for authenticated user:', userEmail, 'userType:', session.user.userType, 'isAdmin:', isAdmin);

      let erpNextOrders: any[] = [];
      let customer: any = null;

      if (isAdmin) {
        // System User - zobraz všetky objednávky
        console.log('[user-orders] Admin user - fetching all orders');
        erpNextOrders = await erpNextService.getAllSalesOrders();
      } else {
        // Obyčajný užívateľ - zobraz len svoje objednávky
        customer = await erpNextService.findCustomerByEmail(userEmail);
        if (!customer) {
          console.log(`[user-orders] No customer found for email: ${userEmail}`);
          return res.json({ orders: [], customer: null });
        }
        console.log(`[user-orders] Found customer: ${customer.customerId} for email: ${userEmail}`);
        erpNextOrders = await erpNextService.getOrdersByCustomer(customer.customerId);
        console.log(`[user-orders] Retrieved ${erpNextOrders.length} orders from ERPNext`);
      }
      
      // Mapuj ERPNext dáta na frontend formát
      const getItemVatRate = (item: any, order: any) => {
        if (item?.item_tax_rate) {
          try {
            const parsed = JSON.parse(item.item_tax_rate);
            const values = Object.values(parsed);
            if (values.length > 0 && typeof values[0] === 'number') {
              return values[0] as number;
            }
          } catch {
            // ignore parse errors
          }
        }

        if (Array.isArray(order?.taxes) && order.taxes.length > 0) {
          const taxWithRate = order.taxes.find((tax: any) => typeof tax.rate === 'number');
          if (taxWithRate) {
            return taxWithRate.rate;
          }
        }

        return 0;
      };

      const orders = erpNextOrders.map(order => {
        const totalWithoutVat = roundCurrency(order.total || 0);
        const grandTotal = roundCurrency(order.grand_total || totalWithoutVat);
        const totalVat = roundCurrency(grandTotal - totalWithoutVat);

        // Parse delivery time - first try from delivery_date (if it's datetime), then from remarks
        let deliveryTime: string | undefined;
        let deliveryDate: string = order.delivery_date || '';
        
        // Check if delivery_date contains time (datetime format: "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD HH:MM")
        if (order.delivery_date && order.delivery_date.includes(' ')) {
          const dateTimeParts = order.delivery_date.split(' ');
          if (dateTimeParts.length >= 2) {
            deliveryDate = dateTimeParts[0]; // Extract just the date part
            const timePart = dateTimeParts[1];
            // Extract time in HH:MM format (remove seconds if present)
            const timeMatch = timePart.match(/^(\d{2}:\d{2})/);
            if (timeMatch) {
              deliveryTime = timeMatch[1];
            }
          }
        }
        
        // Fallback: Parse delivery time from remarks if not found in delivery_date
        if (!deliveryTime && order.remarks) {
          const timeMatch = order.remarks.match(/Čas doručenia:\s*([^\s,]+)/);
          if (timeMatch) {
            deliveryTime = timeMatch[1];
          }
        }
        
        return {
          id: order.name,
          status: order.workflow_state || order.status, // Použi workflow_state ak existuje, inak status
          customer: order.customer,
          customerName: order.customer_name,
          transactionDate: order.transaction_date,
          deliveryDate: deliveryDate, // Use extracted date (without time)
          deliveryTime: deliveryTime, // Pridaj čas doručenia
          total: totalWithoutVat,
          totalWithoutVat,
          totalVat,
          grandTotal,
          currency: order.currency || 'EUR',
          items: (order.items || []).map((item: any) => {
            const qty = item.qty || 0;
            const rate = item.rate || 0;
            const vatRate = getItemVatRate(item, order);
            const amountWithoutVat = item.amount || roundCurrency(rate * qty);
            const priceWithVat = roundCurrency(rate * (1 + vatRate / 100));
            const amountWithVat = roundCurrency(amountWithoutVat * (1 + vatRate / 100));
            const taxAmount = roundCurrency(amountWithVat - amountWithoutVat);

            return {
            itemCode: item.item_code,
            itemName: item.item_name,
              qty,
              rate,
              amount: amountWithoutVat,
              description: item.description,
              vatRate,
              priceWithVat,
              amountWithoutVat,
              amountWithVat,
              taxAmount
            };
          })
        };
      });
      
      res.json({ 
        orders, 
        customer: customer ? { id: customer.customerId } : null,
        isAdminView: isAdmin 
      });
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Debug endpoint to check why orders are not loading
  app.get("/api/debug/user-orders", async (req, res) => {
    try {
      const session = req.session as Session & { user?: any };
      if (!session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userEmail = session.user.email;
      const isAdmin = session.user.userType === "System User";
      
      const debugInfo: any = {
        userEmail,
        userType: session.user.userType,
        isAdmin,
        customer: null,
        ordersFound: 0,
        filterAttempts: []
      };

      if (!isAdmin) {
        const customer = await erpNextService.findCustomerByEmail(userEmail);
        debugInfo.customer = customer;
        
        if (customer) {
          // Try filter by customer
          try {
            erpNextService.refreshClient();
            const response1 = await erpNextService.client.get('/resource/Sales%20Order', {
              params: {
                filters: JSON.stringify([['customer', '=', customer.customerId]]),
                fields: JSON.stringify(['name', 'customer', 'customer_name']),
                limit_page_length: 10
              }
            });
            debugInfo.filterAttempts.push({
              method: 'customer filter',
              customerId: customer.customerId,
              found: response1.data.data?.length || 0,
              sampleOrders: response1.data.data?.slice(0, 3).map((o: any) => ({
                name: o.name,
                customer: o.customer,
                customer_name: o.customer_name
              })) || []
            });
          } catch (e: any) {
            debugInfo.filterAttempts.push({
              method: 'customer filter',
              error: e.message
            });
          }

          // Try filter by customer_name
          try {
            const customerResponse = await erpNextService.client.get(`/resource/Customer/${customer.customerId}`);
            const customerName = customerResponse.data.data?.customer_name;
            if (customerName) {
              erpNextService.refreshClient();
              const response2 = await erpNextService.client.get('/resource/Sales%20Order', {
                params: {
                  filters: JSON.stringify([['customer_name', '=', customerName]]),
                  fields: JSON.stringify(['name', 'customer', 'customer_name']),
                  limit_page_length: 10
                }
              });
              debugInfo.filterAttempts.push({
                method: 'customer_name filter',
                customerName,
                found: response2.data.data?.length || 0,
                sampleOrders: response2.data.data?.slice(0, 3).map((o: any) => ({
                  name: o.name,
                  customer: o.customer,
                  customer_name: o.customer_name
                })) || []
              });
            }
          } catch (e: any) {
            debugInfo.filterAttempts.push({
              method: 'customer_name filter',
              error: e.message
            });
          }

          // Try manual filtering
          try {
            erpNextService.refreshClient();
            const allOrdersResponse = await erpNextService.client.get('/resource/Sales%20Order', {
              params: {
                fields: JSON.stringify(['name', 'customer', 'customer_name']),
                limit_page_length: 50
              }
            });
            
            const allOrders = allOrdersResponse.data.data || [];
            const matchingOrders = allOrders.filter((order: any) => {
              const orderCustomer = (order.customer || '').trim();
              const orderCustomerName = (order.customer_name || '').trim();
              return orderCustomer === customer.customerId || 
                     orderCustomerName === customer.customerId ||
                     orderCustomer.toLowerCase() === customer.customerId.toLowerCase() ||
                     orderCustomerName.toLowerCase() === customer.customerId.toLowerCase();
            });
            
            debugInfo.filterAttempts.push({
              method: 'manual filtering',
              totalOrders: allOrders.length,
              found: matchingOrders.length,
              sampleOrders: matchingOrders.slice(0, 3).map((o: any) => ({
                name: o.name,
                customer: o.customer,
                customer_name: o.customer_name
              }))
            });
          } catch (e: any) {
            debugInfo.filterAttempts.push({
              method: 'manual filtering',
              error: e.message
            });
          }
        }
      }

      res.json(debugInfo);
    } catch (error: any) {
      console.error("Error in debug endpoint:", error);
      res.status(500).json({ error: "Failed to fetch debug info", message: error.message });
    }
  });

  // Get user invoices
  app.get("/api/user-invoices", async (req, res) => {
    try {
      // Skontroluj či je užívateľ prihlásený
      const session = req.session as Session & { user?: any };
      if (!session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userEmail = session.user.email;
      const isAdmin = session.user.userType === "System User";
      console.log(`[user-invoices] Fetching invoices for authenticated user: ${userEmail}, userType: ${session.user.userType}, isAdmin: ${isAdmin}`);

      let erpInvoices: any[] = [];
      let customer: any = null;

      if (isAdmin) {
        // System User - zobraz všetky faktúry
        console.log('[user-invoices] Admin user - fetching all invoices');
        erpInvoices = await erpNextService.getAllSalesInvoices();
      } else {
        // Obyčajný užívateľ - zobraz len svoje faktúry
        customer = await erpNextService.findCustomerByEmail(userEmail);
        if (!customer) {
          console.log(`[user-invoices] No customer found for email: ${userEmail}`);
          return res.json({ invoices: [] });
        }
        erpInvoices = await erpNextService.getSalesInvoicesForCustomer(customer.customerId);
      }
      
      // Transformuj ERPNext faktúry na frontend formát
      const invoices: Invoice[] = erpInvoices.map(erpInvoice => ({
        id: erpInvoice.name,
        orderNumber: undefined, // Sales order nie je dostupný cez ERPNext API
        issueDate: erpInvoice.posting_date,
        dueDate: erpInvoice.due_date,
        amount: erpInvoice.grand_total,
        outstandingAmount: erpInvoice.outstanding_amount,
        currency: erpInvoice.currency,
        status: erpInvoice.status,
        customer: erpInvoice.customer // Pridaj informáciu o zákazníkovi pre admin pohľad
      }));
      
      console.log(`[user-invoices] Returning ${invoices.length} invoices for user ${userEmail}`);
      res.json({ 
        invoices,
        isAdminView: isAdmin 
      });
    } catch (error) {
      console.error("Error fetching user invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Server-side deposit calculation logic
  function calculateDeposit(cartItems: any[]) {
    const netSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const grossSubtotalRaw = cartItems.reduce((sum, item) => {
      const grossPrice = typeof item.priceWithVat === 'number'
        ? item.priceWithVat
        : item.price * (1 + ((item.vatRate ?? 0) / 100));
      return sum + (grossPrice * item.quantity);
    }, 0);
    const subtotal = roundCurrency(grossSubtotalRaw);
    
    // Check if any item contains cake categories
    const containsTorta = cartItems.some(item => 
      item.category === 'Torty' || 
      item.category === 'Torta na mieru' ||
      item.category === 'Torty na mieru'
    );
    
    // Check if any item is a custom cake
    const containsCustomCake = cartItems.some(item => 
      item.name === 'Torta na mieru' ||
      item.id.startsWith('custom-cake-') ||
      item.category === 'Torty na mieru'
    );
    
    let requiresDeposit = false;
    let reason = 'none';
    
    if (containsCustomCake) {
      requiresDeposit = true;
      reason = 'contains_custom_cake';
    } else if (containsTorta) {
      requiresDeposit = true;
      reason = 'contains_cake';
    } else if (subtotal > 150) {
      requiresDeposit = true;
      reason = 'high_total';
    }
    
    const depositPercentage = requiresDeposit ? 50 : 0;
    const depositAmount = requiresDeposit ? roundCurrency(subtotal * 0.5) : 0;
    
    return {
      subtotal,
      subtotalNet: netSubtotal,
      depositAmount,
      depositPercentage,
      requiresDeposit,
      reason
    };
  }

  // Start checkout process - create Sales Order first
  app.post("/api/checkout/start", async (req, res) => {
    try {
      const { cartItems, customerInfo, deliveryInfo, paymentMethod, paymentAmount } = req.body;
      
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ error: "Invalid cart items" });
      }

      if (!customerInfo || !customerInfo.email) {
        return res.status(400).json({ error: "Customer information required" });
      }

      if (!deliveryInfo || !deliveryInfo.date) {
        return res.status(400).json({ error: "Delivery information required" });
      }

      // Calculate deposit and total amounts
      const depositCalculation = calculateDeposit(cartItems);
      const {
        subtotal: subtotalWithVat,
        subtotalNet: subtotalWithoutVatRaw,
        depositAmount,
        depositPercentage,
        requiresDeposit
      } = depositCalculation;
      const totalWithVat = subtotalWithVat;
      const totalWithoutVat = roundCurrency(subtotalWithoutVatRaw);
      const depositAmountWithVat = requiresDeposit
        ? roundCurrency(totalWithVat * (depositPercentage / 100))
        : 0;

      // Check if user is authenticated and use their information instead of form data
      const session = req.session as Session & { user?: any };
      const userEmail = session?.user?.email;
      
      let finalCustomerInfo = customerInfo;
      
      if (userEmail) {
        // User is authenticated - find their existing customer record
        const existingCustomer = await erpNextService.findCustomerByEmail(userEmail);
        if (existingCustomer) {
          console.log(`Using authenticated user's customer: ${existingCustomer.customerId} instead of form data`);
          // User is authenticated - use their existing customer ID directly without recreating
          const customerId = existingCustomer.customerId;
          
          // Create Sales Order directly with authenticated user's customer
          // Combine date and time into delivery_date if time is provided
          let deliveryDateValue = deliveryInfo.date;
          if (deliveryInfo.time) {
            // Combine date and time into datetime format
            deliveryDateValue = `${deliveryInfo.date} ${deliveryInfo.time}:00`;
          }
          
          // Build description with delivery time if provided (for remarks as backup)
          const deliveryDescription = deliveryInfo.time 
            ? `Dátum doručenia: ${deliveryInfo.date}, Čas doručenia: ${deliveryInfo.time}`
            : `Dátum doručenia: ${deliveryInfo.date}`;
          
          const salesOrderData = {
            customer: customerId,
            company: erpCompany,
            delivery_date: deliveryDateValue, // Now includes time if provided
            transaction_date: new Date().toISOString().split('T')[0],
            remarks: deliveryDescription, // Keep in remarks as backup
            items: cartItems.map((item: any) => {
              const isCustomCakeItem = typeof item.id === 'string' && item.id.startsWith('custom-cake-');
              const itemCode = isCustomCakeItem ? 'TORTCUS001' : item.id;
              return {
                item_code: itemCode,
                qty: item.quantity,
                rate: item.price,
                amount: item.price * item.quantity,
                stock_uom: 'Nos',
                parentfield: 'items',
                item_name: isCustomCakeItem ? 'Torta na mieru' : item.name,
                description: item.additional_notes || item.description || '',
                warehouse: erpDefaultWarehouse
              };
            }),
            total: totalWithoutVat,
            grand_total: totalWithVat,
            currency: 'EUR',
            set_warehouse: erpDefaultWarehouse
          };

          const salesOrderId = await erpNextService.createSalesOrder(salesOrderData);
          
          if (!salesOrderId) {
            return res.status(500).json({ error: "Failed to create order in ERP system" });
          }

          console.log(`Sales Order ${salesOrderId} created for authenticated customer ${customerId}`);

          // Determine payment amounts and options based on user selection
          let payNow = totalWithVat; // Default to full amount (with VAT)
          let paymentMode = 'full';
          
          // Use paymentAmount from request if provided, otherwise use default logic
          if (paymentAmount === 'deposit' && requiresDeposit) {
            payNow = depositAmountWithVat;
            paymentMode = 'deposit';
          } else if (paymentAmount === 'full') {
            payNow = totalWithVat;
            paymentMode = 'full';
          } else if ((paymentMethod === 'qr_transfer' || paymentMethod === 'bank_transfer') && requiresDeposit) {
            // Fallback: For online payments without explicit selection, default to deposit
            payNow = depositAmountWithVat || payNow;
            paymentMode = 'deposit';
          }

          return res.json({
            success: true,
            salesOrderId,
            customerId,
            amounts: {
              total: totalWithVat,
              deposit: depositAmountWithVat,
              payNow,
              requiresDeposit,
              mode: paymentMode
            },
            paymentOptions: requiresDeposit 
              ? [
                  { id: 'deposit', label: 'Uhradiť zálohu', amount: depositAmountWithVat, description: `Záloha ${depositPercentage}% z celkovej sumy` },
                  { id: 'full', label: 'Uhradiť celú sumu', amount: totalWithVat, description: `Celková platba ${totalWithVat.toFixed(2)} €` }
                ]
              : [
                  { id: 'full', label: 'Uhradiť celú sumu', amount: totalWithVat, description: `Celková platba ${totalWithVat.toFixed(2)} €` }
                ]
          });
        }
      }

      // Find or create customer in ERPNext using final customer info
      const customerId = await erpNextService.findOrCreateCustomer({
        customer_name: `${finalCustomerInfo.firstName} ${finalCustomerInfo.lastName}`.trim(),
        customer_type: "Individual",
        email_id: finalCustomerInfo.email.toLowerCase(),
        mobile_no: finalCustomerInfo.phone,
        customer_group: "Internetový predaj",
        territory: "Slovakia"
      });

      if (!customerId) {
        return res.status(500).json({ error: "Failed to create customer in ERP system" });
      }

      // Create Sales Order in ERPNext
      // Combine date and time into delivery_date if time is provided
      // ERPNext accepts datetime format: "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD"
      let deliveryDateValue = deliveryInfo.date;
      if (deliveryInfo.time) {
        // Combine date and time into datetime format
        deliveryDateValue = `${deliveryInfo.date} ${deliveryInfo.time}:00`;
      }
      
      // Build description with delivery time if provided (for remarks as backup)
      const deliveryDescription = deliveryInfo.time 
        ? `Dátum doručenia: ${deliveryInfo.date}, Čas doručenia: ${deliveryInfo.time}`
        : `Dátum doručenia: ${deliveryInfo.date}`;
      
      const salesOrderData = {
        customer: customerId,
        company: erpCompany,
        delivery_date: deliveryDateValue, // Now includes time if provided
        transaction_date: new Date().toISOString().split('T')[0],
        remarks: deliveryDescription, // Keep in remarks as backup
        items: cartItems.map((item: any) => {
          const isCustomCakeItem = typeof item.id === 'string' && item.id.startsWith('custom-cake-');
          const itemCode = isCustomCakeItem ? 'TORTCUS001' : item.id;
          return {
            item_code: itemCode,
            qty: item.quantity,
            rate: item.price,
            amount: item.price * item.quantity,
            stock_uom: 'Nos',
            parentfield: 'items',
            item_name: isCustomCakeItem ? 'Torta na mieru' : item.name,
            description: item.additional_notes || item.description || '',
            warehouse: erpDefaultWarehouse
          };
        }),
        total: totalWithoutVat,
        grand_total: totalWithVat,
        currency: 'EUR',
        set_warehouse: erpDefaultWarehouse
      };

      const salesOrderId = await erpNextService.createSalesOrder(salesOrderData);
      
      if (!salesOrderId) {
        return res.status(500).json({ error: "Failed to create order in ERP system" });
      }

      console.log(`Sales Order ${salesOrderId} created for customer ${customerId}`);

      // Determine payment amounts and options based on user selection
      let payNow = totalWithVat; // Default to full amount with VAT
      let paymentMode = 'full';
      
      // Use paymentAmount from request if provided, otherwise use default logic
      if (paymentAmount === 'deposit' && requiresDeposit) {
        payNow = depositAmountWithVat;
        paymentMode = 'deposit';
      } else if (paymentAmount === 'full') {
        payNow = totalWithVat;
        paymentMode = 'full';
      } else if (paymentMethod === 'card' && requiresDeposit) {
        // Fallback: For online payments without explicit selection, default to deposit
        payNow = depositAmountWithVat || payNow;
        paymentMode = 'deposit';
      }

      res.json({
        success: true,
        salesOrderId,
        customerId,
        amounts: {
          total: totalWithVat,
          deposit: depositAmountWithVat,
          payNow,
          requiresDeposit,
          mode: paymentMode
        },
        paymentOptions: requiresDeposit ? [
          {
            id: 'deposit',
            label: 'Uhradiť zálohu (50%)',
            amount: depositAmountWithVat,
            description: `Záloha ${depositPercentage}% z celkovej sumy ${totalWithVat.toFixed(2)} €`
          },
          {
            id: 'full',
            label: 'Uhradiť celú sumu',
            amount: totalWithVat,
            description: `Celková platba ${totalWithVat.toFixed(2)} €`
          }
        ] : [
          {
            id: 'full',
            label: 'Uhradiť celú sumu',
            amount: totalWithVat,
            description: `Celková platba ${totalWithVat.toFixed(2)} €`
          }
        ]
      });

    } catch (error: any) {
      console.error('Error starting checkout process:', error);
      res.status(500).json({
        error: "Failed to start checkout process",
        message: error.message
      });
    }
  });

  // Prepare existing order for payment - apply deposit logic to existing Sales Order
  app.post("/api/order/prepare-payment", async (req, res) => {
    try {
      const { orderId } = req.body;
      
      // Check if user is authenticated
      const session = req.session as Session & { user?: any };
      if (!session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required" });
      }

      // Get existing Sales Order from ERPNext
      const salesOrder = await erpNextService.getSalesOrderById(orderId);
      if (!salesOrder) {
        return res.status(404).json({ error: "Sales Order not found" });
      }

      // Verify that this Sales Order belongs to the authenticated user (or user is admin)
      // Find customer by email (same approach as in user-orders API)
      const userEmail = session.user.email;
      const isAdmin = session.user.userType === "System User" || session.user.isAdmin === true;
      
      console.log(`[ORDER-AUTH] User: ${userEmail}, isAdmin: ${isAdmin}, Order: ${orderId}, Order Customer: ${salesOrder.customer}`);
      
      // Admin users can access all orders
      if (!isAdmin) {
        const customer = await erpNextService.findCustomerByEmail(userEmail);
        
        console.log(`[ORDER-AUTH] Regular user - Found Customer: ${customer?.customerId}, Order Customer: ${salesOrder.customer}`);
        
        if (!customer || salesOrder.customer !== customer.customerId) {
          console.log(`[ORDER-AUTH] Security check failed: User ${userEmail} (customer: ${customer?.customerId}) tried to access order ${orderId} belonging to ${salesOrder.customer}`);
          return res.status(403).json({ error: "Access denied - order does not belong to authenticated user" });
        }
      } else {
        console.log(`[ORDER-AUTH] Admin user - allowing access to order ${orderId}`);
      }

      // Check if order is in a state that allows payment
      const allowedStatuses = ['Draft', 'To Deliver and Bill', 'To Bill', 'Overdue'];
      if (!allowedStatuses.includes(salesOrder.status)) {
        return res.status(400).json({ 
          error: "Order cannot be paid in current status",
          currentStatus: salesOrder.status 
        });
      }

      // Convert Sales Order items to format expected by calculateDeposit
      const orderItems = (salesOrder.items || []).map((item: any) => {
        let vatRate = 0;
        if (item.item_tax_rate) {
          try {
            const parsed = JSON.parse(item.item_tax_rate);
            const values = Object.values(parsed);
            if (values.length > 0 && typeof values[0] === 'number') {
              vatRate = values[0] as number;
            }
          } catch {
            vatRate = 0;
          }
        } else if (Array.isArray(salesOrder.taxes) && salesOrder.taxes.length > 0 && typeof salesOrder.taxes[0].rate === 'number') {
          vatRate = salesOrder.taxes[0].rate;
        }

        // Calculate prices with and without VAT
        const priceWithoutVat = item.rate; // rate is typically without VAT in ERPNext
        const priceWithVat = roundCurrency(priceWithoutVat * (1 + (vatRate / 100)));
        const netAmount = roundCurrency(priceWithoutVat * item.qty);
        const vatAmount = roundCurrency(netAmount * (vatRate / 100));
        const amountWithVat = roundCurrency(netAmount + vatAmount);

        return {
          id: item.item_code,
          name: item.item_name,
          price: priceWithoutVat,
          priceWithVat,
          vatRate,
          quantity: item.qty,
          netAmount,
          vatAmount,
          amountWithVat,
          description: item.description || '',
          // Try to determine category from item code or name patterns
          category: item.item_code === 'TORTCUS001' || 
                   (item.item_name && item.item_name.toLowerCase().includes('torta na mieru')) || 
                   item.item_code.startsWith('custom-cake-') 
                     ? 'Torty na mieru' 
                     : item.item_code.startsWith('TORT') || 
                       (item.item_name && item.item_name.toLowerCase().includes('torta'))
                     ? 'Torty'
                     : 'Zákusky'
        };
      });

      // Apply deposit calculation logic
      const depositCalculation = calculateDeposit(orderItems);
      const {
        subtotal: subtotalWithVat,
        subtotalNet: subtotalWithoutVatRaw,
        depositAmount,
        depositPercentage,
        requiresDeposit
      } = depositCalculation;

      // Use the grand_total from ERPNext if available, otherwise use calculated subtotal
      const grandTotal = salesOrder.grand_total || subtotalWithVat;
      const totalWithoutVat = roundCurrency(subtotalWithoutVatRaw);
      const totalVat = roundCurrency(grandTotal - totalWithoutVat);

      // Determine payment amounts and options
      const depositAmountWithVat = requiresDeposit
        ? roundCurrency(grandTotal * (depositPercentage / 100))
        : 0;

      let payNow = grandTotal; // Default to full amount
      let paymentMode = 'full';
      
      if (requiresDeposit) {
        // For orders requiring deposits, default to deposit
        payNow = depositAmountWithVat || grandTotal;
        paymentMode = 'deposit';
      }

      res.json({
        success: true,
        salesOrderId: orderId,
        customerId: salesOrder.customer,
        orderStatus: salesOrder.status,
        workflowState: salesOrder.workflow_state,
        deliveryDate: salesOrder.delivery_date,
        amounts: {
          total: grandTotal,
          totalWithoutVat,
          totalVat,
          deposit: depositAmountWithVat,
          payNow: payNow,
          requiresDeposit,
          mode: paymentMode
        },
        paymentOptions: requiresDeposit ? [
          {
            id: 'deposit',
            label: 'Uhradiť zálohu (50%)',
            amount: depositAmountWithVat,
            description: `Záloha ${depositPercentage}% z celkovej sumy ${grandTotal.toFixed(2)} €`
          },
          {
            id: 'full',
            label: 'Uhradiť celú sumu',
            amount: grandTotal,
            description: `Celková platba ${grandTotal.toFixed(2)} €`
          }
        ] : [
          {
            id: 'full',
            label: 'Uhradiť celú sumu',
            amount: grandTotal,
            description: 'Celková platba'
          }
        ],
        items: orderItems
      });

    } catch (error: any) {
      console.error('Error preparing order for payment:', error);
      res.status(500).json({
        error: "Failed to prepare order for payment",
        message: error.message
      });
    }
  });

  // Get QR payment details for bank transfer
  app.get("/api/qr-payment/:salesOrderId", async (req, res) => {
    try {
      const { salesOrderId } = req.params;
      
      console.log(`[qr-payment] START: API call for Sales Order: ${salesOrderId}`);
      
      if (!salesOrderId) {
        console.log(`[qr-payment] ERROR: No Sales Order ID provided`);
        return res.status(400).json({ error: "Sales Order ID is required" });
      }

      console.log(`[qr-payment] CALLING: erpNextService.getQRPaymentDetails`);

      // Get QR payment details from ERPNext - NO FALLBACKS ALLOWED
      const qrPaymentDetails = await erpNextService.getQRPaymentDetails(salesOrderId);
      
      if (!qrPaymentDetails) {
        console.log(`[qr-payment] ERROR: No QR payment details found in ERPNext for Sales Order: ${salesOrderId}`);
        return res.status(404).json({ 
          error: "QR payment details not found",
          message: "Sales Order not found in ERPNext or bank details not configured",
          requiresERPNext: true
        });
      }

      console.log(`[qr-payment] SUCCESS: ERPNext data found`);
      res.json({
        success: true,
        data: qrPaymentDetails
      });

    } catch (error: any) {
      console.error('[qr-payment] EXCEPTION: Error fetching QR payment details:', error);
      res.status(500).json({ 
        error: "Failed to fetch QR payment details",
        message: error.message 
      });
    }
  });

  // Gallery API endpoints
  // Get all gallery images
  app.get("/api/gallery", async (req, res) => {
    try {
      const images = await storage.getGalleryImages();
      res.json({ images });
    } catch (error) {
      console.error("Error fetching gallery images:", error);
      res.status(500).json({ error: "Failed to fetch gallery images" });
    }
  });

  // Get single gallery image
  app.get("/api/gallery/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const image = await storage.getGalleryImage(id);
      
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      res.json({ image });
    } catch (error) {
      console.error("Error fetching gallery image:", error);
      res.status(500).json({ error: "Failed to fetch gallery image" });
    }
  });

  // Upload new gallery image (Admin only)
  app.post("/api/gallery", (req, res, next) => {
    // Get multer instance from app locals
    const upload = (req as any).app.locals.upload;
    upload.single('image')(req, res, next);
  }, async (req, res) => {
    try {
      // Check if user is authenticated and is admin
      const session = req.session as Session & { user?: any };
      if (!session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if user is System User (admin) in ERPNext
      const userEmail = session.user.email;
      const systemUserCheck = await erpNextService.isSystemUser(userEmail);
      
      if (!systemUserCheck.success || !systemUserCheck.isSystemUser) {
        console.log(`[gallery-upload] Access denied for user: ${userEmail} (not System User)`);
        return res.status(403).json({ 
          error: "Access denied",
          message: "Only System Users can upload images to gallery"
        });
      }
      
      console.log(`[gallery-upload] System User: ${userEmail} uploading image`);
      
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
      }
      
      const { title, description, category } = req.body;
      
      // Validate required fields
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      // Use the uploaded file path
      const imageUrl = `/assets/gallery/${req.file.filename}`;
      console.log(`[gallery-upload] File saved: ${req.file.filename}`);
      
      const imageData: InsertGalleryImage = {
        title,
        description: description || '',
        category: category || 'prevadzka',
        uploadedBy: userEmail,
        isPublic: true
      };

      const galleryImage = await storage.createGalleryImage(imageData, imageUrl);
      res.status(201).json({ image: galleryImage });
      
    } catch (error) {
      console.error("Error uploading gallery image:", error);
      
      // Handle multer errors
      if (error instanceof Error && error.message === 'Only image files are allowed!') {
        return res.status(400).json({ error: "Only image files are allowed" });
      }
      
      res.status(500).json({ error: "Failed to upload gallery image" });
    }
  });

  // Update gallery image (Admin only)
  app.put("/api/gallery/:id", (req, res, next) => {
    // Get multer instance from app locals
    const upload = (req as any).app.locals.upload;
    upload.single('image')(req, res, next);
  }, async (req, res) => {
    try {
      // Check if user is authenticated and is System User (admin)
      const session = req.session as Session & { user?: any };
      if (!session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if user is System User (admin) in ERPNext
      const userEmail = session.user.email;
      const systemUserCheck = await erpNextService.isSystemUser(userEmail);
      
      if (!systemUserCheck.success || !systemUserCheck.isSystemUser) {
        console.log(`[gallery-edit] Access denied for user: ${userEmail} (not System User)`);
        return res.status(403).json({ 
          error: "Access denied",
          message: "Only System Users can edit gallery images"
        });
      }

      const { id } = req.params;
      
      // Check if new image file was uploaded
      if (req.file) {
        // New image uploaded - update with new file
        const { title, description, category } = req.body;
        const newImageUrl = `/assets/gallery/${req.file.filename}`;
        
        // Update image with new file
        const updates = {
          title: title || '',
          description: description || '',
          category: category || 'prevadzka'
        };
        
        const updatedImage = await storage.updateGalleryImage(id, updates);
        if (!updatedImage) {
          return res.status(404).json({ error: "Image not found" });
        }
        
        // Update the image URL to point to new file
        updatedImage.imageUrl = newImageUrl;
        
        res.json({ image: updatedImage });
      } else {
        // No new image - just update metadata
        const updates = updateGalleryImageSchema.parse(req.body);
        const updatedImage = await storage.updateGalleryImage(id, updates);
        
        if (!updatedImage) {
          return res.status(404).json({ error: "Image not found" });
        }
        
        res.json({ image: updatedImage });
      }
    } catch (error) {
      console.error("Error updating gallery image:", error);
      res.status(500).json({ error: "Failed to update gallery image" });
    }
  });

  // PUT /api/orders/:id/status - Update order status (admin only)
  app.put('/api/orders/:id/status', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is admin (System User)
      const isAdmin = session.user.userType === "System User";
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      console.log(`[update-order-status] Updating order ${id} to status: ${status}`);

      // Update order status in ERPNext
      const result = await erpNextService.updateOrderStatus(id, status);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: `Stav objednávky ${id} bol úspešne zmenený na ${status}`,
          orderId: id,
          newStatus: status
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.error || 'Nepodarilo sa zmeniť stav objednávky' 
        });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete gallery image (Admin only)
  app.delete("/api/gallery/:id", async (req, res) => {
    try {
      // Check if user is authenticated and is System User (admin)
      const session = req.session as Session & { user?: any };
      if (!session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if user is System User (admin) in ERPNext
      const userEmail = session.user.email;
      const systemUserCheck = await erpNextService.isSystemUser(userEmail);
      
      if (!systemUserCheck.success || !systemUserCheck.isSystemUser) {
        console.log(`[gallery-delete] Access denied for user: ${userEmail} (not System User)`);
        return res.status(403).json({ 
          error: "Access denied",
          message: "Only System Users can delete gallery images"
        });
      }

      const { id } = req.params;
      const deleted = await storage.deleteGalleryImage(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting gallery image:", error);
      res.status(500).json({ error: "Failed to delete gallery image" });
    }
  });

  const httpServer = createServer(app);
  
  // Log registered routes for debugging
  const routes: string[] = [];
  app._router?.stack?.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
    }
  });
  console.log(`[registerRoutes] Registered ${routes.filter((r: string) => r.includes('/api')).length} API routes`);
  console.log(`[registerRoutes] Sample API routes:`, routes.filter((r: string) => r.includes('/api')).slice(0, 5));
  
  return httpServer;
}