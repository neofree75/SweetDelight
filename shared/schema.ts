import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ERPNext Item schema - matches ERPNext Item doctype
export const erpNextItemSchema = z.object({
  name: z.string(), // ERPNext document name (ID)
  item_name: z.string(),
  description: z.string().optional(),
  item_group: z.string(), // Category in ERPNext
  stock_uom: z.string().default("Nos"),
  is_stock_item: z.boolean().default(true),
  include_item_in_manufacturing: z.boolean().default(false),
  disabled: z.boolean().default(false),
  image: z.string().optional(),
  valuation_rate: z.number().optional(), // Cena produktu v ERPNext
  has_variants: z.boolean().default(false), // Či má produkt varianty
  variant_of: z.string().optional(), // Ak je variant, z akého template produktu
  attributes: z.array(z.object({
    attribute: z.string(),
    attribute_value: z.string().optional()
  })).optional(), // Atribúty produktu/variantu
});

// ERPNext Item Variant schema for individual variants
export const erpNextItemVariantSchema = z.object({
  name: z.string(),
  item_name: z.string(), 
  description: z.string().optional(),
  variant_of: z.string(),
  attributes: z.array(z.object({
    attribute: z.string(),
    attribute_value: z.string()
  })),
  valuation_rate: z.number().optional(),
  disabled: z.boolean().default(false),
});

// ERPNext Price List Rate schema
export const erpNextPriceSchema = z.object({
  item_code: z.string(),
  price_list_rate: z.number(),
  currency: z.string().default("EUR"),
  price_list: z.string().default("Standard Selling"),
});

// ERPNext Customer schema
export const erpNextCustomerSchema = z.object({
  customer_name: z.string(),
  customer_type: z.string().default("Individual"),
  customer_group: z.string().default("Internetový predaj"),
  territory: z.string().default("Slovakia"),
  email_id: z.string().email().optional(),
  mobile_no: z.string().optional(),
});

// ERPNext Sales Order schema
export const erpNextSalesOrderSchema = z.object({
  customer: z.string(), // Customer ID from ERPNext
  company: z.string(), // Company field required by ERPNext
  delivery_date: z.string(), // ISO date string
  transaction_date: z.string(), // Transaction date
  items: z.array(z.object({
    item_code: z.string(),
    qty: z.number(),
    rate: z.number(),
    amount: z.number(),
    stock_uom: z.string().default("Nos"), // Jednotka
    parentfield: z.string().default("items"), // Povinné pole pre API
    item_name: z.string(), // Názov položky
    description: z.string().optional(), // Poznámky k položke v ERPNext
  })),
  total: z.number(),
  grand_total: z.number(),
  currency: z.string().default("EUR"),
  // selling_price_list: z.string().default("Standard Selling"), // Dočasne odstránené - price list neexistuje v ERPNext
});

// ERPNext Sales Invoice schema
export const erpNextSalesInvoiceSchema = z.object({
  name: z.string(), // Invoice ID (napr. SINV-2024-00001)
  customer: z.string(), // Customer name
  posting_date: z.string(), // Dátum vystavenia
  due_date: z.string(), // Dátum splatnosti  
  grand_total: z.number(), // Celková suma
  outstanding_amount: z.number(), // Zostávajúca suma na úhradu
  status: z.string(), // Draft, Submitted, Paid, atď
  currency: z.string().default("EUR"),
  sales_order: z.string().optional(), // Odkaz na objednávku ak existuje
});


// Frontend Product schema (simplified for UI)
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  image: z.string(),
  category: z.string(),
  inStock: z.boolean(),
  hasVariants: z.boolean().default(false), // Či má produkt varianty
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    attributes: z.array(z.object({
      attribute: z.string(),
      value: z.string()
    })),
    price: z.number().optional()
  })).optional(), // Dostupné varianty produktu
});

// Frontend Customer schema (for checkout form)
export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  deliveryMethod: z.enum(["pickup", "delivery"]),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

// Frontend Cart Item schema
export const cartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number().min(1),
  image: z.string(),
  additional_notes: z.string().optional(),
});

// Frontend Order schema
export const orderSchema = z.object({
  id: z.string(),
  customerInfo: customerSchema,
  items: z.array(cartItemSchema),
  total: z.number(),
  status: z.enum(["pending", "confirmed", "preparing", "ready", "completed", "failed"]),
  createdAt: z.string(),
  sessionId: z.string().optional(), // Pre správne zmazanie košíka
});

// ERPNext Item Attribute schema - matches ERPNext Item Attribute doctype
export const erpNextItemAttributeSchema = z.object({
  name: z.string(), // ERPNext document name (ID)
  attribute_name: z.string(),
  numeric_values: z.boolean().default(false),
  from_range: z.number().optional(),
  to_range: z.number().optional(),
  increment: z.number().optional(),
  cust_atribut_torta_na_mieru: z.boolean().default(false), // Vlastné pole pre torty na mieru
});

// Schema pre hodnoty atribútov tortov na mieru
export const customCakeAttributeValueSchema = z.object({
  attribute_value: z.string(),
  abbreviation: z.string().optional(),
});

// Schema pre atribúty tortov na mieru (frontend)
export const customCakeAttributeSchema = z.object({
  id: z.string(),
  name: z.string(),
  isNumeric: z.boolean().default(false),
  fromRange: z.number().optional(),
  toRange: z.number().optional(),
  increment: z.number().optional(),
  values: z.array(customCakeAttributeValueSchema).optional(), // Pre textové atribúty
});

// Schema pre custom cake objednávku
export const customCakeOrderSchema = z.object({
  cakeType: z.string().optional(), // Základný typ torty
  selectedAttributes: z.record(z.string()), // key-value páry vybraných atribútov
  specialInstructions: z.string().optional(),
  customerInfo: customerSchema,
  price: z.number(),
});

// Type exports
export type ERPNextItem = z.infer<typeof erpNextItemSchema>;
export type ERPNextItemVariant = z.infer<typeof erpNextItemVariantSchema>;
export type ERPNextPrice = z.infer<typeof erpNextPriceSchema>;
export type ERPNextCustomer = z.infer<typeof erpNextCustomerSchema>;
export type ERPNextSalesOrder = z.infer<typeof erpNextSalesOrderSchema>;

// Schema pre objednávky zobrazované v frontend (z ERPNext)
export const userOrderSchema = z.object({
  id: z.string(), // Meno objednávky z ERPNext (napr. SO-001)
  status: z.string(), // Stav objednávky
  customer: z.string(), // ID zákazníka
  customerName: z.string(), // Meno zákazníka
  transactionDate: z.string(), // Dátum objednávky
  deliveryDate: z.string().optional(), // Dátum doručenia
  total: z.number(), // Celková suma
  grandTotal: z.number(), // Konečná suma
  currency: z.string(), // Mena
  items: z.array(z.object({
    itemCode: z.string(), // Kód položky
    itemName: z.string(), // Názov položky
    qty: z.number(), // Množstvo
    rate: z.number(), // Cena za kus
    amount: z.number(), // Celková suma za položku
    description: z.string().optional(), // Poznámky k položke
  })),
});

// Frontend Invoice schema (simplified for UI)
export const invoiceSchema = z.object({
  id: z.string(),
  orderNumber: z.string().optional(), // Číslo objednávky ak existuje
  issueDate: z.string(), // Dátum vystavenia
  dueDate: z.string(), // Dátum splatnosti
  amount: z.number(), // Celková suma
  outstandingAmount: z.number(), // Zostávajúca suma na úhradu
  currency: z.string(),
  status: z.string(), // Stav faktúry
});

export type UserOrder = z.infer<typeof userOrderSchema>;
export type ERPNextItemAttribute = z.infer<typeof erpNextItemAttributeSchema>;
export type ERPNextSalesInvoice = z.infer<typeof erpNextSalesInvoiceSchema>;

export type Product = z.infer<typeof productSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type CustomCakeAttribute = z.infer<typeof customCakeAttributeSchema>;
export type CustomCakeAttributeValue = z.infer<typeof customCakeAttributeValueSchema>;
export type CustomCakeOrder = z.infer<typeof customCakeOrderSchema>;

// Insert schemas for form validation
export const insertCustomerSchema = customerSchema;
export const insertCartItemSchema = cartItemSchema;
export const insertOrderSchema = orderSchema.omit({ id: true, createdAt: true, status: true });

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
