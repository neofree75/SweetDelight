import type { Express, Request } from "express";
import type { Session } from "express-session";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { erpNextService } from "./erpnext-service";
import { openaiService } from "./openai-service";
import { retellService } from "./retell-service";
import { 
  insertCustomerSchema, 
  insertOrderSchema,
  cartItemSchema,
  chatMessageSchema,
  type CartItem,
  type Product,
  type ERPNextCustomer,
  type ERPNextSalesOrder,
  type ChatMessage 
} from "@shared/schema";
import { z } from "zod";

// Simple in-memory rate limiter for chat
const chatRateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 10; // max 10 requests per minute
  
  const record = chatRateLimit.get(ip);
  
  if (!record || now > record.resetTime) {
    // New window or expired
    chatRateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, resetTime: record.resetTime };
  }
  
  record.count++;
  return { allowed: true };
}

// Chat session state management
interface ChatOrderState {
  step: 'initial' | 'product_selection' | 'quantity' | 'customer_info' | 'confirmation' | 'completed';
  selectedProducts: Array<{
    id: string;
    name: string;
    price: number;
    quantity?: number;
  }>;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  total?: number;
}

const chatSessions: Map<string, ChatOrderState> = new Map();

// Fallback odpovede pre chat s objednávkovou funkcionalitou
async function generateFallbackResponse(message: string, sessionId: string = 'default'): Promise<string> {
  const lowerMessage = message.toLowerCase();
  
  // Získaj alebo vytvor session state
  let orderState = chatSessions.get(sessionId);
  if (!orderState) {
    orderState = {
      step: 'initial',
      selectedProducts: []
    };
    chatSessions.set(sessionId, orderState);
  }

  // Pokračovanie existujúcej objednávky
  if (orderState.step !== 'initial') {
    return await handleOrderProcess(message, sessionId, orderState);
  }

  // Detekcia intencie objednávania
  if (lowerMessage.includes('objedná') || lowerMessage.includes('objednat') || 
      lowerMessage.includes('kúpiť') || lowerMessage.includes('chcem') ||
      lowerMessage.includes('order') || lowerMessage.includes('buy')) {
    
    orderState.step = 'product_selection';
    chatSessions.set(sessionId, orderState);
    
    try {
      // Načítaj dostupné produkty z ERPNext
      const products = await erpNextService.getProductsForFrontend();
      
      let productList = '📋 **Dostupné produkty na objednávku:**\n\n';
      
      // Zákusky (s minimálnym množstvom 10)
      const zakusky = products.filter(p => p.category === 'Zákusky');
      if (zakusky.length > 0) {
        productList += '🧁 **Zákusky (min. 10 ks):**\n';
        zakusky.forEach(p => {
          productList += `• ${p.name} - ${p.price.toFixed(2)}€/ks\n`;
        });
        productList += '\n';
      }
      
      // Torty  
      const torty = products.filter(p => p.category === 'Torty');
      if (torty.length > 0) {
        productList += '🎂 **Torty:**\n';
        torty.forEach(p => {
          productList += `• ${p.name} - ${p.price.toFixed(2)}€\n`;
        });
        productList += '\n';
      }
      
      // Ostatné produkty
      const ostatne = products.filter(p => !['Zákusky', 'Torty'].includes(p.category));
      if (ostatne.length > 0) {
        productList += '🍰 **Ostatné produkty:**\n';
        ostatne.forEach(p => {
          productList += `• ${p.name} - ${p.price.toFixed(2)}€\n`;
        });
        productList += '\n';
      }
      
      productList += '💬 **Napíšte názov produktu ktorý chcete objednať**, alebo napíšte "zruš" pre ukončenie objednávky.';
      
      return productList;
      
    } catch (error) {
      console.error('Error fetching products for chat:', error);
      return 'Prepáčte, momentálne nemôžem načítať zoznam produktov. Skúste neskôr alebo nás kontaktujte na +421 917 795 731.';
    }
  }
  
  // Základné odpovede
  if (lowerMessage.includes('ahoj') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return '👋 Ahoj! Som Linda, vaša AI asistentka pre cukráreň Marsela Bakery.\n\n✨ **Môžem vám pomôcť s:**\n• 📋 Vytvorením objednávky priamo v chate\n• 📍 Informáciami o produktoch a cenách\n• 🕒 Otváracími hodinami a kontaktmi\n\n💬 **Napíšte "objednať"** ak chcete urobiť objednávku, alebo sa pýtajte na čokoľvek!';
  }
  
  if (lowerMessage.includes('zákusok') || lowerMessage.includes('zákusky') || lowerMessage.includes('tort') || lowerMessage.includes('cake')) {
    return '🧁 Máme široký výber zákuskov a tortôt!\n\n📋 **Pre objednávku napíšte "objednať"** - pomôžem vám vybrať a objednám priamo tu v chate!\n\nAlebo navštívte náš obchod na stránke. Pre otázky: +421 917 795 731';
  }
  
  if (lowerMessage.includes('cena') || lowerMessage.includes('koľko') || lowerMessage.includes('price')) {
    return '💰 Ceny našich produktov nájdete v obchode na stránke.\n\n📋 **Napíšte "objednať"** - ukážem vám všetky produkty s cenami a pomôžem s objednávkou!\n\nPre cenové ponuky: +421 917 795 731 alebo marcelabakery@gmail.com';
  }
  
  if (lowerMessage.includes('otváracie') || lowerMessage.includes('hodiny') || lowerMessage.includes('open') || lowerMessage.includes('hours')) {
    return '🕒 **Otváracie hodiny:**\n• Pondelok-Piatok: 8:00-17:00\n• Sobota: 9:00-15:00\n• Nedeľa: zatvorené\n\n📍 Dvorníky 364\n☎ +421 917 795 731';
  }
  
  if (lowerMessage.includes('adresa') || lowerMessage.includes('kde') || lowerMessage.includes('address') || lowerMessage.includes('location')) {
    return '📍 **Naša adresa:**\nDvorníky 364, Slovenská republika\n\n☎ +421 917 795 731\n✉ marcelabakery@gmail.com\n\n💬 Napíšte "objednať" pre objednávku priamo tu!';
  }
  
  if (lowerMessage.includes('kontakt') || lowerMessage.includes('telefón') || lowerMessage.includes('email')) {
    return '📞 **Kontaktné údaje:**\n☎ +421 917 795 731\n✉ marcelabakery@gmail.com\n📍 Dvorníky 364, Slovenská republika\n\n💬 Napíšte "objednať" pre objednávku priamo v chate!';
  }
  
  // Obecná odpoveď
  return '👋 Ďakujem za správu! Som Linda z cukrárne Marsela Bakery.\n\n✨ **Napíšte "objednať"** pre vytvorenie objednávky priamo tu!\n\nAlebo sa pýtajte na produkty, ceny, otváracie hodiny...\n\n📞 Kontakt: +421 917 795 731';
}

// Spracovanie viacstupňového procesu objednávania
async function handleOrderProcess(message: string, sessionId: string, orderState: ChatOrderState): Promise<string> {
  const lowerMessage = message.toLowerCase().trim();
  
  // Možnosť zrušiť objednávku kedykoľvek
  if (lowerMessage === 'zruš' || lowerMessage === 'zrušiť' || lowerMessage === 'cancel') {
    chatSessions.delete(sessionId);
    return '❌ Objednávka zrušená. Napíšte "objednať" ak chcete začať znova, alebo sa pýtajte na čokoľvek iné!';
  }
  
  try {
    switch (orderState.step) {
      case 'product_selection':
        return await handleProductSelection(message, sessionId, orderState);
      
      case 'quantity':
        return await handleQuantitySelection(message, sessionId, orderState);
      
      case 'customer_info':
        return await handleCustomerInfo(message, sessionId, orderState);
      
      case 'confirmation':
        return await handleOrderConfirmation(message, sessionId, orderState);
      
      default:
        chatSessions.delete(sessionId);
        return 'Chyba pri spracovaní objednávky. Napíšte "objednať" pre nový začiatok.';
    }
  } catch (error) {
    console.error('Error in handleOrderProcess:', error);
    chatSessions.delete(sessionId);
    return 'Nastala chyba pri spracovaní objednávky. Skúste znova napísať "objednať".';
  }
}

// Výber produktu
async function handleProductSelection(message: string, sessionId: string, orderState: ChatOrderState): Promise<string> {
  const products = await erpNextService.getProductsForFrontend();
  
  // Nájdi produkt podľa názvu (fuzzy matching)
  const searchTerm = message.toLowerCase().trim();
  const foundProduct = products.find(p => 
    p.name.toLowerCase().includes(searchTerm) ||
    searchTerm.includes(p.name.toLowerCase().substring(0, 5))
  );
  
  if (!foundProduct) {
    return `❓ Produkt "${message}" som nenašla. \n\n📋 **Dostupné produkty:**\n${products.map(p => `• ${p.name}`).join('\n')}\n\n💬 Skúste napísať presný názov alebo napíšte "zruš".`;
  }
  
  // Pridaj produkt do objednávky
  orderState.selectedProducts = [{
    id: foundProduct.id,
    name: foundProduct.name,  
    price: foundProduct.price
  }];
  
  orderState.step = 'quantity';
  chatSessions.set(sessionId, orderState);
  
  const isZakusok = foundProduct.category === 'Zákusky';
  const minQuantity = isZakusok ? 10 : 1;
  
  return `✅ **Vybratý produkt:** ${foundProduct.name}\n💰 **Cena:** ${foundProduct.price.toFixed(2)}€${isZakusok ? '/ks' : ''}\n\n${isZakusok ? '🧁 **Pre zákusky je minimálne množstvo 10 kusov.**\n' : ''}💬 **Koľko kusov chcete?** (min. ${minQuantity})`;
}

// Výber množstva
async function handleQuantitySelection(message: string, sessionId: string, orderState: ChatOrderState): Promise<string> {
  const quantity = parseInt(message.trim());
  const product = orderState.selectedProducts[0];
  
  if (isNaN(quantity) || quantity < 1) {
    return '❓ Prosím zadajte platné číslo (napr. 10, 20). Koľko kusov chcete?';
  }
  
  // Kontrola minimálneho množstva pre zákusky
  const products = await erpNextService.getProductsForFrontend();
  const productInfo = products.find(p => p.id === product.id);
  const isZakusok = productInfo?.category === 'Zákusky';
  
  if (isZakusok && quantity < 10) {
    return '🧁 **Pre zákusky je minimálne množstvo 10 kusov.** Koľko kusov chcete? (min. 10)';
  }
  
  // Nastav množstvo a vypočítaj celkovú sumu
  product.quantity = quantity;
  const total = product.price * quantity;
  orderState.total = total;
  orderState.step = 'customer_info';
  orderState.customerInfo = {};
  
  chatSessions.set(sessionId, orderState);
  
  return `✅ **${quantity}x ${product.name}**\n💰 **Celková suma: ${total.toFixed(2)}€**\n\n📝 **Teraz potrebujem vaše údaje na objednávku:**\n\n👤 **Ako sa voláte?** (meno a priezvisko)`;
}

// Zbieranie údajov o zákazníkovi  
async function handleCustomerInfo(message: string, sessionId: string, orderState: ChatOrderState): Promise<string> {
  if (!orderState.customerInfo) orderState.customerInfo = {};
  
  const info = orderState.customerInfo;
  const trimmedMessage = message.trim();
  
  if (!info.name) {
    if (trimmedMessage.length < 2) {
      return '👤 Prosím zadajte vaše celé meno (meno a priezvisko):';
    }
    info.name = trimmedMessage;
    chatSessions.set(sessionId, orderState);
    return `✅ **Meno:** ${info.name}\n\n📧 **Teraz váš email:**`;
  }
  
  if (!info.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedMessage)) {
      return '📧 Prosím zadajte platný email (napr. jan.novak@example.com):';
    }
    info.email = trimmedMessage;
    chatSessions.set(sessionId, orderState);
    return `✅ **Email:** ${info.email}\n\n📱 **Teraz váše telefónne číslo:** (napr. +421 901 234 567)`;
  }
  
  if (!info.phone) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{9,}$/;
    if (!phoneRegex.test(trimmedMessage)) {
      return '📱 Prosím zadajte platné telefónne číslo (napr. +421 901 234 567 alebo 0901234567):';
    }
    info.phone = trimmedMessage;
    orderState.step = 'confirmation';
    chatSessions.set(sessionId, orderState);
    
    const product = orderState.selectedProducts[0];
    return `✅ **Telefón:** ${info.phone}\n\n📋 **SÚHRN OBJEDNÁVKY:**\n\n👤 **Zákazník:** ${info.name}\n📧 **Email:** ${info.email}\n📱 **Telefón:** ${info.phone}\n\n🛒 **Produkt:** ${product.quantity}x ${product.name}\n💰 **Celková suma:** ${orderState.total?.toFixed(2)}€\n\n✅ **Napíšte "potvrdiť"** pre odoslanie objednávky do ERPNext\n❌ **Alebo "zruš"** pre zrušenie`;
  }
  
  return 'Chyba pri spracovaní údajov. Skúste znova.';
}

// Potvrdenie objednávky
async function handleOrderConfirmation(message: string, sessionId: string, orderState: ChatOrderState): Promise<string> {
  const lowerMessage = message.toLowerCase().trim();
  
  if (lowerMessage !== 'potvrdiť' && lowerMessage !== 'potvrdit' && lowerMessage !== 'ano' && lowerMessage !== 'áno') {
    return '❓ Napíšte "potvrdiť" pre odoslanie objednávky alebo "zruš" pre zrušenie.';
  }
  
  try {
    // Priprav údaje pre ERPNext API
    const product = orderState.selectedProducts[0];
    const customer = orderState.customerInfo!;
    
    const orderData = {
      customerInfo: {
        name: customer.name!,
        email: customer.email!,
        phone: customer.phone!,
        deliveryMethod: 'pickup' as const // Default pickup
      },
      items: [{
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: product.quantity!,
        image: '', // Chat orders don't need images
        additional_notes: `Objednané cez chat AI asistentku Linda`
      }],
      total: orderState.total!
    };
    
    // Vytvor objednávku v ERPNext cez existujúci API
    const response = await fetch(`http://localhost:5000/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    // Vyčisti session
    orderState.step = 'completed';
    chatSessions.delete(sessionId);
    
    return `🎉 **OBJEDNÁVKA ÚSPEŠNE VYTVORENÁ!**\n\n✅ **Číslo objednávky:** ${result.erpNextOrderId}\n✅ **ID zákazníka:** ${result.customerId}\n\n📦 **Detaily:**\n• ${product.quantity}x ${product.name}\n• Celková suma: ${orderState.total?.toFixed(2)}€\n\n📞 **Kontaktujeme vás na ${customer.phone}** pre potvrdenie a dohodnutie vyzdvihnutia.\n\n✉ **Potvrdenie bolo odoslané na ${customer.email}**\n\n🏪 **Odber:** Dvorníky 364, počas otváracích hodín\n\n💬 Ďakujeme za objednávku! Napíšte "objednať" ak chcete objednať ešte niečo iné.`;
    
  } catch (error) {
    console.error('Error creating order via chat:', error);
    chatSessions.delete(sessionId);
    return `❌ **Chyba pri vytváraní objednávky:** ${error instanceof Error ? error.message : 'Neznáma chyba'}\n\n📞 Prosím kontaktujte nás priamo na +421 917 795 731 alebo skúste znova napísať "objednať".`;
  }
}

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
        message: "Cache refreshed successfully",
        productCount: products.length,
        categories: Array.from(new Set(products.map(p => p.category))).sort()
      });
    } catch (error) {
      console.error("Error refreshing cache:", error);
      res.status(500).json({ error: "Failed to refresh cache" });
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
          // selling_price_list: "Standard Selling", // Dočasne odstránené - price list neexistuje v ERPNext
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

  // N8N Chat adapter endpoint
  app.post('/api/n8n-chat', async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const body = req.body;
    
    // Extract action and data from n8n chat format
    const action = req.query.action as string || 'sendMessage';
    const chatInput = body.chatInput || body.message || '';
    const sessionId = body.sessionId || `n8n-${Date.now()}`;
    
    console.log(`[n8n-chat] ${action} from ${clientIp}, session: ${sessionId}: ${chatInput.substring(0, 50)}...`);
    
    try {
      if (action === 'loadPreviousSession') {
        // Return empty session for now - could implement session storage later
        return res.json({
          sessionId,
          messages: []
        });
      }
      
      if (action === 'sendMessage') {
        // Rate limiting check
        const rateLimitResult = checkRateLimit(clientIp);
        if (!rateLimitResult.allowed) {
          return res.json({
            output: 'Priveľa požiadaviek. Skúste znova neskôr.',
            sessionId: sessionId
          });
        }
        
        // Use existing OpenAI service
        const result = await openaiService.processChatMessage(chatInput, sessionId);
        
        // Format response for n8n chat
        const response = {
          output: result.message,
          sessionId: sessionId
        };
        
        console.log(`[n8n-chat] Response generated for session ${sessionId}`);
        return res.json(response);
      }
      
      return res.status(400).json({ error: 'Unknown action' });
    } catch (error) {
      console.error(`[n8n-chat] Error for session ${sessionId}:`, error);
      return res.json({
        output: 'Prepáčte, nastala chyba. Kontaktujte nás na +421 917 795 731 alebo marcelabakery@gmail.com',
        sessionId: sessionId
      });
    }
  });

  // Chat proxy endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      
      // Rate limiting check
      const rateLimitResult = checkRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({ 
          error: "Priveľa požiadaviek. Skúste znova neskôr.",
          resetTime: rateLimitResult.resetTime 
        });
      }

      // Validate request body
      const chatData = chatMessageSchema.parse(req.body);
      
      // Check message length (additional safety) - len ak je message definované
      if (chatData.message && chatData.message.length > 1000) {
        return res.status(400).json({ 
          error: "Správa je príliš dlhá. Maximum 1000 znakov." 
        });
      }
      
      // Get session ID
      const sessionId = chatData.sessionId || req.session.id;

      // Ak nie je správa, môže byť inicializačný request
      if (!chatData.message) {
        console.log(`[chat] Initialization request from ${clientIp}, session: ${sessionId}`);
      } else {
        console.log(`[chat] Processing message from ${clientIp}, session: ${sessionId}: ${chatData.message.substring(0, 50)}...`);
      }

      let responseSent = false;
      
      // Use OpenAI directly as primary chat service
      try {
        console.log(`[chat] Using OpenAI for session ${sessionId}`);
        
        // Získaj dostupné produkty pre AI kontext s timeoutom
        let products: Array<{ id: string; name: string; price: number; category: string }> = [];
        try {
          const productPromise = erpNextService.getProductsForFrontend();
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('ERP timeout')), 5000);
          });
          products = await Promise.race([productPromise, timeoutPromise]);
        } catch (erpError) {
          console.log(`[chat] ERP products fetch failed for session ${sessionId}, continuing without product context`);
        }
        
        // Získaj user info ak je prihlásený
        const userInfo = (req.session as any)?.user ? {
          name: (req.session as any).user.name,
          email: (req.session as any).user.email
        } : undefined;
        
        const aiResponse = await openaiService.processChatMessage(
          chatData.message || '',
          sessionId,
          userInfo,
          products
        );
        
        // Ak AI detekuje objednávkový intent, presmeruj na objednávkový fallback systém
        if (aiResponse.needsOrderProcessing) {
          console.log(`[chat] AI detected order intent, switching to order processing for session ${sessionId}`);
          
          // Timeout pre fallback response tiež
          try {
            const fallbackPromise = generateFallbackResponse(chatData.message || '', sessionId);
            const timeoutPromise = new Promise<string>((_, reject) => {
              setTimeout(() => reject(new Error('Fallback timeout')), 8000);
            });
            const orderResponse = await Promise.race([fallbackPromise, timeoutPromise]);
            
            if (!responseSent) {
              responseSent = true;
              return res.json({
                message: orderResponse,
                source: 'ai_order_fallback',
                intent: aiResponse.extractedIntent
              });
            }
          } catch (fallbackError) {
            console.error(`[chat] Fallback response failed for session ${sessionId}:`, fallbackError);
            if (!responseSent) {
              responseSent = true;
              return res.json({
                message: '📋 Pre objednávky kontaktujte +421 917 795 731 alebo navštívte náš obchod na stránke.',
                source: 'fallback_timeout',
                intent: 'order'
              });
            }
          }
        }
        
        console.log(`[chat] OpenAI response generated for session ${sessionId}`);
        if (!responseSent) {
          responseSent = true;
          return res.json({
            message: aiResponse.message,
            source: 'openai',
            intent: aiResponse.extractedIntent
          });
        }
        
      } catch (openaiError) {
        console.error(`[chat] OpenAI request failed:`, openaiError);
        
        if (!responseSent) {
          // Ako posledná možnosť použij základný fallback systém s timeoutom
          try {
            const fallbackPromise = generateFallbackResponse(chatData.message || '', sessionId);
            const timeoutPromise = new Promise<string>((_, reject) => {
              setTimeout(() => reject(new Error('Final fallback timeout')), 5000);
            });
            const fallbackResponse = await Promise.race([fallbackPromise, timeoutPromise]);
            
            console.log(`[chat] Using basic fallback response for session ${sessionId}`);
            responseSent = true;
            return res.json({
              message: fallbackResponse,
              source: 'fallback'
            });
          } catch (finalError) {
            console.error(`[chat] Final fallback failed for session ${sessionId}:`, finalError);
            responseSent = true;
            return res.json({
              message: '👋 Ďakujem za správu! Som Linda z cukrárne Marsela Bakery. Pre objednávky: +421 917 795 731',
              source: 'emergency_fallback'
            });
          }
        }
      }
      
    } catch (error) {
      console.error("Chat proxy error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Neplatné údaje správy", 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: "Chyba pri spracovaní chat správy" 
      });
    }
  });

  // Retell AI Chat endpoint - backend to backend communication
  app.post("/api/retell-chat", async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      
      // Rate limiting check
      const rateLimitResult = checkRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({ 
          error: "Priveľa požiadaviek. Skúste znova neskôr.",
          resetTime: rateLimitResult.resetTime 
        });
      }

      // Validate request body
      const { message, sessionId } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ 
          error: "Správa je povinná." 
        });
      }

      if (message.length > 1000) {
        return res.status(400).json({ 
          error: "Správa je príliš dlhá. Maximum 1000 znakov." 
        });
      }

      const finalSessionId = sessionId || req.session.id || 'default';
      
      console.log(`[retell-chat] Processing message from ${clientIp}, session: ${finalSessionId}: ${message.substring(0, 50)}...`);
      
      // Use Retell AI service for response
      const response = await retellService.sendChatMessage(message, finalSessionId);
      
      console.log(`[retell-chat] Response generated for session ${finalSessionId}`);
      
      res.json({
        response: response,
        sessionId: finalSessionId
      });
      
    } catch (error) {
      console.error('[retell-chat] Error:', error);
      res.status(500).json({ 
        error: "Nastala chyba pri spracovaní správy.",
        response: "Ospravedlňujem sa, momentálne nemôžem odpovedať. Kontaktujte nás prosím na +421 917 795 731."
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
