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
  custom_min_mnozstvo_obj_predaj: z.number().optional().default(1), // Minimálne množstvo pre objednanie
  custom_is_eshop: z.boolean().optional().default(false), // Označenie či sa má zobraziť v eshope
  published: z.union([z.number(), z.boolean()]).optional(), // Či je produkt publikovaný na web stránke (1/true alebo 0/false)
  show_in_website: z.union([z.number(), z.boolean()]).optional(), // Či sa má produkt zobraziť na webe
  attributes: z.array(z.object({
    attribute: z.string(),
    attribute_value: z.string().optional()
  })).optional(), // Atribúty produktu/variantu
  // VAT/Tax related fields
  taxes: z.array(z.object({
    item_tax_template: z.string().optional(), // Tax template name
    tax_category: z.string().optional(), // Tax category
    tax_rate: z.number().optional() // Tax rate percentage
  })).optional(), // Item taxes from ERPNext
});

// ERPNext Item Variant schema for individual variants
export const erpNextItemVariantSchema = z.object({
  name: z.string(),
  item_name: z.string(), 
  description: z.string().optional(),
  variant_of: z.string(),
  custom_min_mnozstvo_obj_predaj: z.number().optional().default(1), // Minimálne množstvo pre objednanie
  custom_is_eshop: z.boolean().optional().default(false), // Označenie či sa má zobraziť v eshope
  published: z.union([z.number(), z.boolean()]).optional(), // Či je variant publikovaný na web stránke
  show_in_website: z.union([z.number(), z.boolean()]).optional(), // Či sa má variant zobraziť na webe
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
  set_warehouse: z.string().optional(), // Default warehouse for the order
  items: z.array(z.object({
    item_code: z.string(),
    qty: z.number(),
    rate: z.number(),
    amount: z.number(),
    stock_uom: z.string().default("Nos"), // Jednotka
    parentfield: z.string().default("items"), // Povinné pole pre API
    item_name: z.string(), // Názov položky
    description: z.string().optional(), // Poznámky k položke v ERPNext
    warehouse: z.string().optional(), // Sklad pre konkretnu položku
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
  items: z.array(z.object({
    item_code: z.string(),
    qty: z.number(),
    rate: z.number(),
    amount: z.number(),
    stock_uom: z.string().default("Nos"),
    parentfield: z.string().default("items"),
    item_name: z.string(),
    description: z.string().optional(),
  })).optional(),
});

// ERPNext Payment Entry schema
export const erpNextPaymentEntrySchema = z.object({
  payment_type: z.string(), // "Receive" pre zákazníkov, "Pay" pre dodávateľov
  party_type: z.string().default("Customer"), // "Customer", "Supplier"
  party: z.string(), // Customer/Supplier ID
  company: z.string(), // Company field
  mode_of_payment: z.string().default("Card Payment"), // Spôsob platby
  paid_amount: z.number(), // Uhradená suma
  received_amount: z.number(), // Prijatá suma (po smernom kurze)
  currency: z.string().default("EUR"),
  posting_date: z.string(), // Dátum zaúčtovania
    reference_no: z.string().optional(), // Referenčné číslo externej platby
  reference_date: z.string().optional(), // Dátum referencie
  // Pre advance payment proti Sales Order
  references: z.array(z.object({
    reference_doctype: z.string(), // "Sales Order" alebo "Sales Invoice"
    reference_name: z.string(), // ID objednávky alebo faktúry
    allocated_amount: z.number(), // Alokovaná suma
    parentfield: z.string().default("references"),
  })).optional(),
});

// ERPNext Sales Taxes and Charges Template schema
export const erpNextSalesTaxesAndChargesTemplateSchema = z.object({
  name: z.string(), // Template name
  title: z.string().optional(), // Display title
  is_default: z.boolean().default(false), // Je predvolená šablóna
  company: z.string().optional(), // Spoločnosť
  taxes: z.array(z.object({
    charge_type: z.string(), // "On Net Total", "On Previous Row Total", etc.
    account_head: z.string(), // Tax account
    description: z.string().optional(), // Popis dane
    rate: z.number(), // Sadzba dane v percentách
    tax_amount: z.number().optional(), // Suma dane
  })).optional(),
});


// Frontend Product schema (simplified for UI)
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  short_description: z.string().optional(), // Krátky popis pre zoznam produktov (z Website Item)
  web_long_description: z.string().optional(), // Dlhý popis pre detail produktu (z Website Item)
  price: z.number(), // Cena bez DPH
  image: z.string(),
  category: z.string(),
  inStock: z.boolean(),
  minOrderQuantity: z.number().default(1), // Minimálne množstvo pre objednanie
  hasVariants: z.boolean().default(false), // Či má produkt varianty
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    minOrderQuantity: z.number().default(1), // Minimálne množstvo pre varianty
    attributes: z.array(z.object({
      attribute: z.string(),
      value: z.string()
    })),
    price: z.number().optional(), // Cena bez DPH
    vatRate: z.number().optional(), // Sadzba DPH v percentách
    priceWithVat: z.number().optional(), // Cena s DPH
  })).optional(), // Dostupné varianty produktu
  // VAT information
  vatRate: z.number().default(0), // Sadzba DPH v percentách (napr. 20 pre 20%)
  priceWithVat: z.number(), // Cena s DPH
  // Gallery images from Website Slideshow
  galleryImages: z.array(z.string()).optional(), // Ďalšie obrázky produktu z slideshow
  // Additional product specifications sourced from Website Item
  specifications: z.array(z.object({
    key: z.string(),
    label: z.string(),
    value: z.string(),
  })).optional(),
  // Creation date from ERPNext (for sorting by newest)
  creation: z.string().optional(), // ISO date string
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
  price: z.number(), // Cena bez DPH
  quantity: z.number().min(1),
  image: z.string(),
  additional_notes: z.string().optional(),
  minOrderQuantity: z.number().default(1), // Minimálne množstvo pre objednanie
  // VAT information
  vatRate: z.number().default(0), // Sadzba DPH v percentách
  priceWithVat: z.number(), // Cena s DPH
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
export type ERPNextSalesInvoice = z.infer<typeof erpNextSalesInvoiceSchema>;
export type ERPNextPaymentEntry = z.infer<typeof erpNextPaymentEntrySchema>;
export type ERPNextSalesTaxesAndChargesTemplate = z.infer<typeof erpNextSalesTaxesAndChargesTemplateSchema>;

// Schema pre objednávky zobrazované v frontend (z ERPNext)
export const userOrderSchema = z.object({
  id: z.string(), // Meno objednávky z ERPNext (napr. SO-001)
  status: z.string(), // Stav objednávky
  customer: z.string(), // ID zákazníka
  customerName: z.string(), // Meno zákazníka
  transactionDate: z.string(), // Dátum objednávky
  deliveryDate: z.string().optional(), // Dátum doručenia
  deliveryTime: z.string().optional(), // Čas doručenia
  total: z.number(), // Celková suma bez DPH
  totalWithoutVat: z.number().optional(), // Alias pre celkovú sumu bez DPH
  totalVat: z.number().optional(), // Celková DPH
  grandTotal: z.number(), // Konečná suma
  currency: z.string(), // Mena
  items: z.array(z.object({
    itemCode: z.string(), // Kód položky
    itemName: z.string(), // Názov položky
    qty: z.number(), // Množstvo
    rate: z.number(), // Cena za kus
    amount: z.number(), // Celková suma za položku bez DPH
    amountWithoutVat: z.number().optional(), // Alias pre sumu bez DPH
    amountWithVat: z.number().optional(), // Celková suma s DPH
    taxAmount: z.number().optional(), // Výška DPH
    vatRate: z.number().optional(), // Sadzba DPH
    priceWithVat: z.number().optional(), // Cena s DPH
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
  customer: z.string().optional(), // Názov zákazníka (pre admin pohľad)
});

// All type exports
export type UserOrder = z.infer<typeof userOrderSchema>;
export type ERPNextItemAttribute = z.infer<typeof erpNextItemAttributeSchema>;
export type Product = z.infer<typeof productSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type Customer = z.infer<typeof customerSchema>;
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

// Gallery Category schema
export const galleryCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(), // Display label (can be different from name)
  createdAt: z.string(),
  createdBy: z.string(),
  isDefault: z.boolean().default(false) // Default categories cannot be deleted
});

// Gallery Image schema
export const galleryImageSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  imageUrl: z.string(),
  category: z.string(), // Category ID or name
  uploadedAt: z.string(),
  uploadedBy: z.string(),
  isPublic: z.boolean().default(true)
});

export const insertGalleryImageSchema = z.object({
  title: z.string().min(1, "Názov je povinný"),
  description: z.string().optional(),
  category: z.string().default('prevadzka'), // Category ID or name
  uploadedBy: z.string(),
  isPublic: z.boolean().default(true)
});

export const updateGalleryImageSchema = z.object({
  title: z.string().min(1, "Názov je povinný").optional(),
  description: z.string().optional(),
  category: z.string().optional() // Category ID or name
});

export const insertGalleryCategorySchema = z.object({
  name: z.string().min(1, "Názov kategórie je povinný"),
  label: z.string().min(1, "Zobrazovaný názov je povinný"),
  createdBy: z.string(),
  isDefault: z.boolean().default(false)
});

export const updateGalleryCategorySchema = z.object({
  name: z.string().min(1, "Názov kategórie je povinný").optional(),
  label: z.string().min(1, "Zobrazovaný názov je povinný").optional()
});

export type GalleryImage = z.infer<typeof galleryImageSchema>;
export type InsertGalleryImage = z.infer<typeof insertGalleryImageSchema>;
export type UpdateGalleryImage = z.infer<typeof updateGalleryImageSchema>;
export type GalleryCategory = z.infer<typeof galleryCategorySchema>;
export type InsertGalleryCategory = z.infer<typeof insertGalleryCategorySchema>;
export type UpdateGalleryCategory = z.infer<typeof updateGalleryCategorySchema>;
