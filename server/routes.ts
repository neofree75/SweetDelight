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
          company: process.env.ERPNEXT_COMPANY || "Glam cake s. r. o.",
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

  // Stripe payment intent endpoint
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency = 'eur', metadata = {} } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          ...metadata,
          source: 'marsela-bakery'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ 
        error: "Error creating payment intent",
        message: error.message 
      });
    }
  });

  // Confirm payment and process order
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