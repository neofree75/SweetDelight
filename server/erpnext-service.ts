import axios, { AxiosInstance } from "axios";

export class ERPNextService {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private readonly CACHE_DURATION = 30 * 1000; // 30 sekúnd
  private productCache: { data: any[]; timestamp: number } | null = null;

  constructor() {
    // Inicializuj prázdne hodnoty, ale client vytvor až cez refreshClient
    this.baseUrl = "";
    this.apiKey = "";
    this.apiSecret = "";
    this.client = axios.create();
  }

  /**
   * Znova načíta konfiguráciu z environment premenných
   * a vytvorí nového axios klienta
   */
  private refreshClient() {
    this.baseUrl = process.env.ERPNEXT_URL || "";
    this.apiKey = process.env.ERPNEXT_API_KEY || "";
    this.apiSecret = process.env.ERPNEXT_API_SECRET || "";

    this.client = axios.create({
      baseURL: this.baseUrl ? `${this.baseUrl}/api` : "",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${this.apiKey}:${this.apiSecret}`,
      },
      timeout: 10000,
    });
  }

  /**
   * Overí, či sú ERPNext credentials nastavené a API dostupné
   */
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    this.refreshClient();

    if (!this.baseUrl) {
      return { valid: false, error: "ERPNEXT_URL environment variable is not set" };
    }
    if (!this.apiKey) {
      return { valid: false, error: "ERPNEXT_API_KEY environment variable is not set" };
    }
    if (!this.apiSecret) {
      return { valid: false, error: "ERPNEXT_API_SECRET environment variable is not set" };
    }
    if (!process.env.ERPNEXT_COMPANY) {
      return { valid: false, error: "ERPNEXT_COMPANY environment variable is not set" };
    }

    try {
      const response = await this.client.get("/method/frappe.ping");
      if (response.status !== 200) {
        return {
          valid: false,
          error: `ERPNext API returned status ${response.status} instead of 200`,
        };
      }
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `ERPNext connection error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Príklad použitia pri fetchovaní itemov
   */
  async getItems(): Promise<any[]> {
    this.refreshClient();

    try {
      const response = await this.client.get("/resource/Item", {
        params: {
          fields: JSON.stringify([
            "name",
            "item_name",
            "description",
            "item_group",
            "stock_uom",
            "is_stock_item",
            "disabled",
            "image",
            "valuation_rate",
          ]),
          filters: JSON.stringify([["disabled", "=", "0"]]),
          limit_page_length: 100,
        },
      });

      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching items from ERPNext:", error);
      return [];
    }
  }

  /**
   * Zdravotná kontrola API
   */
  async healthCheck(): Promise<boolean> {
    this.refreshClient();

    try {
      const response = await this.client.get("/method/frappe.ping");
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const erpNextService = new ERPNextService();