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

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        message: result.message || 'Prepáčte, nastala chyba pri spracovaní vašej správy.',
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

    return `Si Linda, AI asistentka pre cukráreň "Sladká Chvíľa" v Dvorníkoch, Slovensko.

DÔLEŽITÉ INFORMÁCIE O CUKRÁRNI:
- Názov: Sladká Chvíľa  
- Adresa: Dvorníky 364, Slovenská republika
- Telefón: +421 917 795 731
- Email: marcelabakery@gmail.com
- Otváracie hodiny: Pondelok-Piatok 8:00-17:00, Sobota 9:00-15:00, Nedeľa zatvorené

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