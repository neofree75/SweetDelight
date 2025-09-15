import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatAIResponse {
  message: string;
  needsOrderProcessing?: boolean;
  extractedIntent?: 'order' | 'info' | 'general';
}

export class OpenAIService {
  
  async processChatMessage(
    message: string, 
    sessionId: string,
    userInfo?: { name?: string; email?: string },
    availableProducts?: Array<{ id: string; name: string; price: number; category: string }>
  ): Promise<ChatAIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(availableProducts);
      const userPrompt = this.buildUserPrompt(message, userInfo);

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1000
      });

      const rawContent = response.choices[0].message.content || '{}';
      
      // Safe JSON parsing with fallback
      let result: any = {};
      try {
        result = JSON.parse(rawContent);
        // JSON parsing successful
      } catch (parseError) {
        console.error(`[OpenAI] Session ${sessionId}: JSON parse failed:`, parseError);
        result = {
          message: 'Prepáčte, nastala chyba pri spracovaní vašej správy. Skúste neskôr alebo nás kontaktujte na +421 917 795 731.',
          needsOrderProcessing: false,
          intent: 'general'
        };
      }
      
      return {
        message: result.message || 'Prepáčte, nastala chyba pri spracovaní vašej správy. Skúste neskôr alebo nás kontaktujte na +421 917 795 731.',
        needsOrderProcessing: result.needsOrderProcessing === true,
        extractedIntent: result.intent || 'general'
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  private buildSystemPrompt(availableProducts?: Array<{ id: string; name: string; price: number; category: string }>): string {
    const productsContext = availableProducts 
      ? `\n\nDostupné produkty:\n${availableProducts.map(p => `- ${p.name} (${p.category}) - ${p.price.toFixed(2)}€${p.category === 'Zákusky' ? '/ks (min. 10ks)' : ''}`).join('\n')}`
      : '';

    return `Si Linda, AI asistentka pre cukráreň "Marsela Bakery" v Dvorníkoch, Slovensko.

DÔLEŽITÉ INFORMÁCIE O CUKRÁRNI:
- Názov: Marsela Bakery  
- Adresa: Dvorníky 364, Slovenská republika
- Telefón: +421 917 795 731
- Email: marcelabakery@gmail.com
- Otváracie hodiny: Pondelok zatvorené, Utorok - štvrtok 14:00-20:00, Piatok - Nedeľa 14:00-20:30

OBCHODNÉ PRAVIDLÁ:
- Pre zákusky je minimálne množstvo 10 kusov
- Všetky objednávky sa vyzdvihujú na adrese (nie donáška)
- Torty na mieru sa cenovo dohodujú individuálne

TVOJA ÚLOHA:
1. Odpovedaj VÝLUČNE v slovenčine
2. Buď priateľská, profesionálna a nápomocná
3. Pri otázkach o objednávkach ponúkni možnosť vytvoriť objednávku priamo v chate
4. Poskytuj presné informácie o produktoch a cenách
5. Pri objednávkach spomeň minimálne množstvá a pravidlá
6. Zhrň pred objednaním celú objednávku a až ked potvrdí zákazník, spracuj objednávku

DETEKCIA OBJEDNÁVOK:
- Ak zákazník chce objednať/kúpiť/chce produkty, nastav needsOrderProcessing: true
- Ak sa pýta na produkty/ceny/info, nastav intent: "info" 
- Pri objednávaní nastav intent: "order"
- Pri ostatnom nastav intent: "general"

${productsContext}

FORMÁT ODPOVEDE (JSON):
{
  "message": "tvoja odpoveď v slovenčine",
  "needsOrderProcessing": boolean,
  "intent": "order" | "info" | "general"
}`;
  }

  private buildUserPrompt(message: string, userInfo?: { name?: string; email?: string }): string {
    const userContext = userInfo 
      ? `\n(Zákazník: ${userInfo.name || 'Neznámy'}, Email: ${userInfo.email || 'Nezadaný'})`
      : '';
      
    return `Správa od zákazníka: "${message}"${userContext}

Odpovedz ako Linda - AI asistentka cukrárne. Buď milá, profesionálna a nápomocná.`;
  }
}

export const openaiService = new OpenAIService();