import type { Express, Request } from "express";
import type { Session } from "express-session";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { erpNextService } from "./erpnext-service";
import { 
  insertCustomerSchema, 
  insertOrderSchema,
  cartItemSchema,
  type CartItem,
  type Product,
  type ERPNextCustomer,
  type ERPNextSalesOrder 
} from "@shared/schema";
import { z } from "zod";

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
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await erpNextService.getProductById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ error: "Produkt nebol nájdený" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Chyba pri načítavaní produktu" });
    }
  });

  // Cart management endpoints
  app.get("/api/cart", async (req, res) => {
    try {
      const sessionId = req.session.id;
      if (!sessionId) {
        return res.status(401).json({ error: "No session found" });
      }
      const items = await storage.getCartItems(sessionId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const sessionId = req.session.id;
      if (!sessionId) {
        return res.status(401).json({ error: "No session found" });
      }
      const cartItems = z.array(cartItemSchema).parse(req.body.items);
      await storage.updateCartItems(sessionId, cartItems);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating cart:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid cart data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update cart" });
    }
  });

  app.delete("/api/cart", async (req, res) => {
    try {
      const sessionId = req.session.id;
      if (!sessionId) {
        return res.status(401).json({ error: "No session found" });
      }
      await storage.clearCart(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  // Order processing endpoints
  app.post("/api/orders", async (req, res) => {
    try {
      // Validate order data
      const orderData = insertOrderSchema.parse(req.body);
      
      // Create temporary order record
      const tempOrder = await storage.createTempOrder(orderData);
      
      try {
        // Find or create customer in ERPNext
        const erpNextCustomerData: Omit<ERPNextCustomer, 'name'> = {
          customer_name: orderData.customerInfo.name,
          customer_type: "Individual",
          customer_group: "Internetový predaj",
          territory: "Slovakia",
          email_id: orderData.customerInfo.email,
          mobile_no: orderData.customerInfo.phone,
        };
        
        const customerId = await erpNextService.findOrCreateCustomer(erpNextCustomerData);
        
        if (!customerId) {
          throw new Error("Failed to create customer in ERPNext");
        }

        // Prepare sales order data
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 2); // 2 days from now
        const transactionDate = new Date().toISOString().split('T')[0];

        const salesOrderData: ERPNextSalesOrder = {
          customer: customerId,
          company: process.env.ERPNEXT_COMPANY!,
          delivery_date: deliveryDate.toISOString().split('T')[0],
          transaction_date: transactionDate,
          items: orderData.items.map(item => ({
            item_code: item.id,
            qty: item.quantity,
            rate: item.price,
            amount: item.price * item.quantity,
            additional_notes: item.additional_notes || '',
          })),
          total: orderData.total,
          grand_total: orderData.total,
          currency: "EUR",
          selling_price_list: "Standard Selling",
        };

        // Create sales order in ERPNext
        const salesOrderId = await erpNextService.createSalesOrder(salesOrderData);
        
        if (!salesOrderId) {
          throw new Error("Failed to create sales order in ERPNext");
        }

        // Update order status to confirmed
        await storage.updateOrderStatus(tempOrder.id, 'confirmed');
        
        // Clear the cart
        if (req.session.id) {
          await storage.clearCart(req.session.id);
        }

        res.status(201).json({
          orderId: tempOrder.id,
          erpNextOrderId: salesOrderId,
          customerId: customerId,
          status: 'confirmed',
          message: 'Objednávka bola úspešne vytvorená'
        });

      } catch (erpError) {
        // Update order status to failed
        await storage.updateOrderStatus(tempOrder.id, 'failed');
        
        console.error("ERPNext integration error:", erpError);
        res.status(500).json({ 
          error: "Chyba pri spracovaní objednávky v ERPNext",
          orderId: tempOrder.id,
          details: erpError instanceof Error ? erpError.message : "Unknown error"
        });
      }

    } catch (error) {
      console.error("Order creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Neplatné údaje objednávky", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Chyba pri vytváraní objednávky" });
    }
  });

  // Get order status
  app.get("/api/orders/:orderId", async (req, res) => {
    try {
      const order = await storage.getTempOrder(req.params.orderId);
      
      if (!order) {
        return res.status(404).json({ error: "Objednávka nebola nájdená" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Chyba pri načítavaní objednávky" });
    }
  });

  // User registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      // Validate required fields
      const { email, firstName, lastName, mobile } = req.body;
      
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ 
          success: false, 
          message: "Email, meno a priezvisko sú povinné polia" 
        });
      }

      // Prepare user data for ERPNext
      const userData = {
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        mobile_no: mobile ? mobile.trim() : undefined
      };

      // Register user in ERPNext
      const result = await erpNextService.registerUser(userData);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
      
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Chyba pri registrácii používateľa" 
      });
    }
  });

  // User password reset endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      // Validate required fields
      const { key, user, newPassword } = req.body;
      
      if (!key || !user || !newPassword) {
        return res.status(400).json({ 
          success: false, 
          message: "Kľúč, používateľ a nové heslo sú povinné polia" 
        });
      }

      // Basic password validation
      if (newPassword.length < 8) {
        return res.status(400).json({ 
          success: false, 
          message: "Heslo musí mať aspoň 8 znakov" 
        });
      }

      // Prepare password reset data for ERPNext
      const resetData = {
        key: key.trim(),
        user: user.trim(),
        new_password: newPassword
      };

      // Update password in ERPNext
      const result = await erpNextService.updateUserPassword(resetData);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Chyba pri zmene hesla" 
      });
    }
  });

  // Get user profile endpoint
  app.get("/api/profile", async (req, res) => {
    try {
      // Pre teraz použijeme jednoduchý spôsob identifikácie používateľa
      // V budúcnosti by sme mali implementovať sessions alebo JWT tokeny
      const userEmail = req.query.email as string;
      
      if (!userEmail) {
        return res.status(401).json({ 
          success: false, 
          message: "Neautorizovaný prístup - chýba email používateľa" 
        });
      }

      // Get user profile from ERPNext
      const result = await erpNextService.getUserProfile(userEmail);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
      
    } catch (error) {
      console.error("Profile get error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Chyba pri načítavaní profilu" 
      });
    }
  });

  // Update user profile endpoint
  app.put("/api/profile", async (req, res) => {
    try {
      // Pre teraz použijeme jednoduchý spôsob identifikácie používateľa
      // V budúcnosti by sme mali implementovať sessions alebo JWT tokeny
      const userEmail = req.query.email as string;
      const { firstName, lastName, email, mobile } = req.body;
      
      if (!userEmail) {
        return res.status(401).json({ 
          success: false, 
          message: "Neautorizovaný prístup - chýba email používateľa" 
        });
      }

      // Validate required fields
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ 
          success: false, 
          message: "Meno, priezvisko a email sú povinné polia" 
        });
      }

      // Prepare profile data for ERPNext
      const profileData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        mobile: mobile ? mobile.trim() : undefined
      };

      // Update user profile in ERPNext
      const result = await erpNextService.updateUserProfile(userEmail, profileData);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Chyba pri aktualizácii profilu" 
      });
    }
  });

  // User login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      // Set response content type to JSON
      res.type('application/json');
      
      // Validate required fields
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Email a heslo sú povinné polia" 
        });
      }

      // Prepare login credentials for ERPNext
      const credentials = {
        email: email.trim(),
        password: password
      };

      // Authenticate user with ERPNext
      const result = await erpNextService.loginUser(credentials);
      
      if (result.success && result.data) {
        // Store user session data
        if (req.session) {
          (req.session as any).user = {
            email: result.data.email,
            name: result.data.name,
            firstName: result.data.firstName,
            lastName: result.data.lastName
          };
        }
        
        return res.status(200).json({
          success: true,
          message: result.message,
          user: {
            email: result.data.email,
            name: result.data.name
          }
        });
      } else {
        return res.status(401).json({
          success: false,
          message: result.message || 'Neplatné prihlasovacie údaje'
        });
      }
      
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Chyba pri prihlásení" 
      });
    }
  });

  // User logout endpoint
  app.post("/api/logout", async (req, res) => {
    try {
      // Clear session
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({ 
              success: false, 
              message: "Chyba pri odhlásení" 
            });
          }
          res.status(200).json({ 
            success: true, 
            message: "Úspešne odhlásený" 
          });
        });
      } else {
        res.status(200).json({ 
          success: true, 
          message: "Úspešne odhlásený" 
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Chyba pri odhlásení" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
