import type { Express, Request } from "express";
import type { Session } from "express-session";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { erpNextService } from "./erpnext-service";
import Stripe from "stripe";
import { 
  insertCustomerSchema, 
  insertOrderSchema,
  cartItemSchema,
  userOrderSchema,
  invoiceSchema,
  type CartItem,
  type Product,
  type ERPNextCustomer,
  type ERPNextSalesOrder,
  type UserOrder,
  type Invoice,
  type InsertOrder 
} from "@shared/schema";
import { z } from "zod";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {

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

  // Get products from ERPNext
  app.get("/api/products", async (req, res) => {
    try {
      const products = await erpNextService.getProductsForFrontend();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
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
          company: 'DEMO - Glam cake s. r. o.',
          delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
          transaction_date: new Date().toISOString().split('T')[0],
          items: salesOrderItems,
          total: orderData.total,
          grand_total: orderData.total,
          currency: "EUR"
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

      res.json({
        success: true,
        user: session.user,
        message: loginResult.message
      });

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
        message: registrationResult.message
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
      if (!session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userEmail = session.user.email;
      const profileResult = await erpNextService.getUserProfile(userEmail);
      
      if (!profileResult.success) {
        return res.status(404).json({ error: profileResult.message });
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

  // Get user orders
  app.get("/api/user-orders", async (req, res) => {
    try {
      const session = req.session as Session & { user?: any };
      if (!session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userEmail = session.user.email;
      console.log('[user-orders] Fetching orders for authenticated user:', userEmail);

      // Find customer by email first
      const customer = await erpNextService.findCustomerByEmail(userEmail);
      if (!customer) {
        return res.json({ orders: [], customer: null });
      }

      // Získaj objednávky z ERPNext pre tohto zákazníka
      const erpNextOrders = await erpNextService.getOrdersByCustomer(customer.customerId);
      
      // Mapuj ERPNext dáta na frontend formát
      const orders = erpNextOrders.map(order => {
        return {
          id: order.name,
          status: order.workflow_state || order.status, // Použi workflow_state ak existuje, inak status
          customer: order.customer,
          customerName: order.customer_name,
          transactionDate: order.transaction_date,
          deliveryDate: order.delivery_date,
          total: order.total || 0,
          grandTotal: order.grand_total || 0,
          currency: order.currency || 'EUR',
          items: (order.items || []).map((item: any) => ({
            itemCode: item.item_code,
            itemName: item.item_name,
            qty: item.qty || 0,
            rate: item.rate || 0,
            amount: item.amount || 0,
            description: item.description
          }))
        };
      });
      
      res.json({ orders, customer: { id: customer.customerId } });
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
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
      console.log(`[user-invoices] Fetching invoices for authenticated user: ${userEmail}`);

      // Find customer by email first
      const customer = await erpNextService.findCustomerByEmail(userEmail);
      if (!customer) {
        console.log(`[user-invoices] No customer found for email: ${userEmail}`);
        return res.json({ invoices: [] });
      }

      // Získaj faktúry z ERPNext pre tohto zákazníka
      const erpInvoices = await erpNextService.getSalesInvoicesForCustomer(customer.customerId);
      
      // Transformuj ERPNext faktúry na frontend formát
      const invoices: Invoice[] = erpInvoices.map(erpInvoice => ({
        id: erpInvoice.name,
        orderNumber: undefined, // Sales order nie je dostupný cez ERPNext API
        issueDate: erpInvoice.posting_date,
        dueDate: erpInvoice.due_date,
        amount: erpInvoice.grand_total,
        outstandingAmount: erpInvoice.outstanding_amount,
        currency: erpInvoice.currency,
        status: erpInvoice.status
      }));
      
      console.log(`[user-invoices] Returning ${invoices.length} invoices for user ${userEmail}`);
      res.json({ invoices });
    } catch (error) {
      console.error("Error fetching user invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Server-side deposit calculation logic
  function calculateDeposit(cartItems: any[]) {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
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
    const depositAmount = requiresDeposit ? subtotal * 0.5 : 0;
    
    return {
      subtotal,
      depositAmount,
      depositPercentage,
      requiresDeposit,
      reason
    };
  }

  // Start checkout process - create Sales Order first
  app.post("/api/checkout/start", async (req, res) => {
    try {
      const { cartItems, customerInfo, deliveryInfo, paymentMethod } = req.body;
      
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
      const { subtotal, depositAmount, requiresDeposit } = depositCalculation;

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
          const salesOrderData = {
            customer: customerId,
            company: 'DEMO - Glam cake s. r. o.',
            delivery_date: deliveryInfo.date,
            transaction_date: new Date().toISOString().split('T')[0],
            items: cartItems.map((item: any) => ({
              item_code: item.id,
              qty: item.quantity,
              rate: item.price,
              amount: item.price * item.quantity,
              stock_uom: 'Nos',
              parentfield: 'items',
              item_name: item.name,
              description: item.additional_notes || ''
            })),
            total: subtotal,
            grand_total: subtotal,
            currency: 'EUR'
          };

          const salesOrderId = await erpNextService.createSalesOrder(salesOrderData);
          
          if (!salesOrderId) {
            return res.status(500).json({ error: "Failed to create order in ERP system" });
          }

          console.log(`Sales Order ${salesOrderId} created for authenticated customer ${customerId}`);

          // Determine payment amounts and options
          let payNow = subtotal; // Default to full amount
          let paymentMode = 'full';
          
          if (paymentMethod === 'card' && requiresDeposit) {
            // For online payments, offer both deposit and full options
            payNow = depositAmount; // Default to deposit for required cases
            paymentMode = 'deposit';
          }

          return res.json({
            success: true,
            salesOrderId,
            customerId,
            amounts: {
              total: subtotal,
              deposit: depositAmount,
              payNow,
              requiresDeposit,
              mode: paymentMode
            },
            paymentOptions: requiresDeposit 
              ? [
                  { id: 'deposit', label: 'Uhradiť zálohu', amount: depositAmount, description: `Záloha ${Math.round((depositAmount / subtotal) * 100)}%` },
                  { id: 'full', label: 'Uhradiť celú sumu', amount: subtotal, description: 'Celková platba' }
                ]
              : [
                  { id: 'full', label: 'Uhradiť celú sumu', amount: subtotal, description: 'Celková platba' }
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
      const salesOrderData = {
        customer: customerId,
        company: 'DEMO - Glam cake s. r. o.',
        delivery_date: deliveryInfo.date,
        transaction_date: new Date().toISOString().split('T')[0],
        items: cartItems.map((item: any) => ({
          item_code: item.id,
          qty: item.quantity,
          rate: item.price,
          amount: item.price * item.quantity,
          stock_uom: 'Nos',
          parentfield: 'items',
          item_name: item.name,
          description: item.additional_notes || ''
        })),
        total: subtotal,
        grand_total: subtotal,
        currency: 'EUR'
      };

      const salesOrderId = await erpNextService.createSalesOrder(salesOrderData);
      
      if (!salesOrderId) {
        return res.status(500).json({ error: "Failed to create order in ERP system" });
      }

      console.log(`Sales Order ${salesOrderId} created for customer ${customerId}`);

      // Determine payment amounts and options
      let payNow = subtotal; // Default to full amount
      let paymentMode = 'full';
      
      if (paymentMethod === 'card' && requiresDeposit) {
        // For online payments, offer both deposit and full options
        payNow = depositAmount; // Default to deposit for required cases
        paymentMode = 'deposit';
      }

      res.json({
        success: true,
        salesOrderId,
        customerId,
        amounts: {
          total: subtotal,
          deposit: depositAmount,
          payNow: payNow,
          requiresDeposit,
          mode: paymentMode
        },
        paymentOptions: requiresDeposit ? [
          {
            id: 'deposit',
            label: 'Uhradiť zálohu (50%)',
            amount: depositAmount,
            description: `Záloha ${depositAmount.toFixed(2)} € z celkovej sumy ${subtotal.toFixed(2)} €`
          },
          {
            id: 'full',
            label: 'Uhradiť celú sumu',
            amount: subtotal,
            description: `Celková platba ${subtotal.toFixed(2)} €`
          }
        ] : [
          {
            id: 'full',
            label: 'Uhradiť celú sumu',
            amount: subtotal,
            description: 'Celková platba'
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

      // Verify that this Sales Order belongs to the authenticated user
      // Find customer by email (same approach as in user-orders API)
      const userEmail = session.user.email;
      const customer = await erpNextService.findCustomerByEmail(userEmail);
      
      console.log(`[ORDER-AUTH] User: ${userEmail}, Found Customer: ${customer?.customerId}, Order: ${orderId}, Order Customer: ${salesOrder.customer}`);
      
      if (!customer || salesOrder.customer !== customer.customerId) {
        console.log(`[ORDER-AUTH] Security check failed: User ${userEmail} (customer: ${customer?.customerId}) tried to access order ${orderId} belonging to ${salesOrder.customer}`);
        return res.status(403).json({ error: "Access denied - order does not belong to authenticated user" });
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
      const orderItems = (salesOrder.items || []).map((item: any) => ({
        id: item.item_code,
        name: item.item_name,
        price: item.rate,
        quantity: item.qty,
        // Try to determine category from item code or name patterns
        category: item.item_code === 'TORTCUS001' || 
                 (item.item_name && item.item_name.toLowerCase().includes('torta na mieru')) || 
                 item.item_code.startsWith('custom-cake-') 
                   ? 'Torty na mieru' 
                   : item.item_code.startsWith('TORT') || 
                     (item.item_name && item.item_name.toLowerCase().includes('torta'))
                   ? 'Torty'
                   : 'Zákusky'
      }));

      // Apply deposit calculation logic
      const depositCalculation = calculateDeposit(orderItems);
      const { subtotal, depositAmount, requiresDeposit } = depositCalculation;

      // Use the grand_total from ERPNext if available, otherwise use calculated subtotal
      const grandTotal = salesOrder.grand_total || subtotal;

      // Determine payment amounts and options
      let payNow = grandTotal; // Default to full amount
      let paymentMode = 'full';
      
      if (requiresDeposit) {
        // For orders requiring deposits, default to deposit
        payNow = depositAmount;
        paymentMode = 'deposit';
      }

      res.json({
        success: true,
        salesOrderId: orderId,
        customerId: salesOrder.customer,
        orderStatus: salesOrder.status,
        deliveryDate: salesOrder.delivery_date,
        amounts: {
          total: grandTotal,
          deposit: depositAmount,
          payNow: payNow,
          requiresDeposit,
          mode: paymentMode
        },
        paymentOptions: requiresDeposit ? [
          {
            id: 'deposit',
            label: 'Uhradiť zálohu (50%)',
            amount: depositAmount,
            description: `Záloha ${depositAmount.toFixed(2)} € z celkovej sumy ${grandTotal.toFixed(2)} €`
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

  // Stripe payment intent endpoint (secured with Sales Order validation)
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { salesOrderId, paymentMode = 'full', currency = 'eur' } = req.body;
      
      if (!salesOrderId) {
        return res.status(400).json({ error: "Sales Order ID is required" });
      }

      if (!['full', 'deposit'].includes(paymentMode)) {
        return res.status(400).json({ error: "Invalid payment mode. Must be 'full' or 'deposit'" });
      }

      // Get Sales Order from ERPNext to validate and calculate amount
      const salesOrder = await erpNextService.getSalesOrderById(salesOrderId);
      if (!salesOrder) {
        return res.status(404).json({ error: "Sales Order not found" });
      }

      // Server-side calculation of expected amount
      const grandTotal = salesOrder.grand_total || 0;
      let expectedAmount = grandTotal;

      if (paymentMode === 'deposit') {
        // Calculate deposit based on server-side rules
        const orderItems = salesOrder.items || [];
        const depositCalculation = calculateDeposit(orderItems.map((item: any) => ({
          id: item.item_code,
          name: item.item_name,
          price: item.rate,
          quantity: item.qty,
          category: item.category // This might not be available from Sales Order
        })));
        
        if (!depositCalculation.requiresDeposit) {
          return res.status(400).json({ error: "Deposit not required for this order" });
        }
        
        expectedAmount = depositCalculation.depositAmount;
      }

      if (expectedAmount <= 0) {
        return res.status(400).json({ error: "Invalid order amount" });
      }

      // Generate idempotency key from session, order, mode, and amount
      const sessionId = req.sessionID || `session-${Date.now()}`;
      const idempotencyKey = `${sessionId}-${salesOrderId}-${paymentMode}-${Math.round(expectedAmount * 100)}`;

      // Get authenticated user's email and find their correct customer ID
      const session = req.session as Session & { user?: any };
      const userEmail = session?.user?.email;
      
      // Find the correct customer for the authenticated user
      let correctCustomerId = salesOrder.customer; // Default to order customer
      if (userEmail) {
        const customer = await erpNextService.findCustomerByEmail(userEmail);
        if (customer) {
          correctCustomerId = customer.customerId;
          console.log(`Using correct customer ${correctCustomerId} for payment intent instead of order customer ${salesOrder.customer}`);
        }
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(expectedAmount * 100), // Convert to cents
        currency,
        metadata: {
          salesOrderId,
          customerId: correctCustomerId,
          expectedAmount: expectedAmount.toString(),
          paymentMode,
          sessionId,
          userEmail: userEmail || '',
          source: 'marsela-bakery'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      }, {
        idempotencyKey // Prevent duplicate payments
      });

      console.log(`Payment Intent created: ${paymentIntent.id} for Sales Order ${salesOrderId}, mode: ${paymentMode}, amount: €${expectedAmount}`);

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        salesOrderId,
        expectedAmount,
        paymentMode
      });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ 
        error: "Error creating payment intent",
        message: error.message 
      });
    }
  });

  // Stripe webhook endpoint with signature verification
  app.post("/api/stripe/webhook", async (req, res) => {
    let event: any;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
        return res.status(400).json({ error: 'Webhook secret not configured' });
      }

      const sig = req.headers['stripe-signature'];
      if (!sig) {
        return res.status(400).json({ error: 'Missing stripe signature' });
      }

      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    try {
      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
        case 'payment_intent.canceled':
          await handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Handle successful payment
  async function handlePaymentSuccess(paymentIntent: any) {
    const { 
      id: paymentIntentId,
      amount,
      currency,
      metadata: { salesOrderId, customerId, expectedAmount, paymentMode, sessionId, userEmail } 
    } = paymentIntent;

    console.log(`Processing successful payment: ${paymentIntentId} for Sales Order ${salesOrderId}, User: ${userEmail}`);

    // Validate payment amount matches expected amount
    const expectedAmountCents = Math.round(parseFloat(expectedAmount) * 100);
    if (amount !== expectedAmountCents) {
      console.error(`Payment amount mismatch: expected ${expectedAmountCents} cents, got ${amount} cents`);
      return;
    }

    // Check idempotency to prevent duplicate processing
    const idempotencyKey = `webhook-${paymentIntentId}`;
    // TODO: Store and check processed webhook events in storage/database
    
    try {
      // Find the correct customer for invoice creation
      let invoiceCustomerId = customerId; // Default to order customer
      
      if (userEmail) {
        // If we have the user's email, find their proper customer record
        const customer = await erpNextService.findCustomerByEmail(userEmail);
        if (customer) {
          invoiceCustomerId = customer.customerId;
          console.log(`Using customer ${invoiceCustomerId} (${userEmail}) for invoice instead of order customer ${customerId}`);
        }
      }
      
      if (paymentMode === 'full') {
        // Full payment: Create Sales Invoice and Payment Entry
        const salesInvoiceId = await erpNextService.createSalesInvoiceFromOrder(salesOrderId, undefined, invoiceCustomerId);
        if (salesInvoiceId) {
          console.log(`Sales Invoice ${salesInvoiceId} created for full payment of Sales Order ${salesOrderId} under customer ${invoiceCustomerId}`);
          
          // Create Payment Entry against the Sales Invoice
          const paymentData = {
            payment_type: 'Receive' as const,
            party_type: 'Customer' as const,
            party: invoiceCustomerId,
            company: 'DEMO - Glam cake s. r. o.',
            mode_of_payment: 'Card Payment',
            paid_amount: parseFloat(expectedAmount),
            received_amount: parseFloat(expectedAmount),
            currency: 'EUR',
            posting_date: new Date().toISOString().split('T')[0],
            reference_no: paymentIntentId,
            reference_date: new Date().toISOString().split('T')[0],
            references: [{
              reference_doctype: 'Sales Invoice',
              reference_name: salesInvoiceId,
              allocated_amount: parseFloat(expectedAmount),
              parentfield: 'references'
            }]
          };
          
          const paymentEntryId = await erpNextService.createPaymentEntry(paymentData);
          if (paymentEntryId) {
            console.log(`Payment Entry ${paymentEntryId} created for Sales Invoice ${salesInvoiceId}`);
            
            // Update Sales Order status to "Uhradená" (Paid) for full payment
            const statusUpdated = await erpNextService.updateSalesOrderStatus(salesOrderId, 'Paid');
            if (statusUpdated) {
              console.log(`Sales Order ${salesOrderId} status updated to "Paid" after full payment`);
            }
          }
        }
      } else if (paymentMode === 'deposit') {
        // Deposit payment: Create advance Payment Entry against Sales Order
        const paymentEntryId = await erpNextService.createAdvancePayment(
          salesOrderId, 
          parseFloat(expectedAmount),
          paymentIntentId
        );
        if (paymentEntryId) {
          console.log(`Advance Payment Entry ${paymentEntryId} created for deposit payment of Sales Order ${salesOrderId}`);
        }
      }
    } catch (error) {
      console.error('Error processing payment in ERPNext:', error);
      // TODO: Store failed webhook processing for retry
    }
  }

  // Handle failed/canceled payment
  async function handlePaymentFailed(paymentIntent: any) {
    const { 
      id: paymentIntentId,
      metadata: { salesOrderId }
    } = paymentIntent;

    console.log(`Payment failed/canceled: ${paymentIntentId} for Sales Order ${salesOrderId}`);
    
    // Sales Order remains open for retry or cash payment
    // No action needed in ERPNext - order stays as draft/pending payment
  }

  // Confirm payment and process order (legacy endpoint - kept for compatibility)
  app.post("/api/confirm-payment", async (req, res) => {
    try {
      const { paymentIntentId, orderData } = req.body;
      
      if (!paymentIntentId || !orderData) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Retrieve the payment intent to verify status
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ 
          error: "Payment not completed",
          status: paymentIntent.status 
        });
      }

      // Process the order in ERPNext
      console.log('Processing order after successful payment:', orderData);
      
      // Here you would create the sales order in ERPNext
      // For now, return success response
      res.json({
        success: true,
        paymentStatus: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency
      });

    } catch (error: any) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ 
        error: "Error confirming payment",
        message: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}