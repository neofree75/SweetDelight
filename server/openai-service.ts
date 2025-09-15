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
        model: "gpt-4o", // Stable model for JSON responses
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "send_chat_response",
            description: "Send response to customer",
            parameters: {
              type: "object",
              required: ["message", "needsOrderProcessing", "intent"],
              properties: {
                message: {
                  type: "string",
                  description: "Response message in Slovak language"
                },
                needsOrderProcessing: {
                  type: "boolean", 
                  description: "Whether customer wants to place an order"
                },
                intent: {
                  type: "string",
                  enum: ["order", "info", "general"],
                  description: "Type of customer inquiry"
                }
              }
            }
          }
        }],
        tool_choice: "required",
        max_tokens: 1000
      });

      // Parse tool call instead of content
      let result: any = {};
      
      if (response.choices[0].message.tool_calls && response.choices[0].message.tool_calls[0]) {
        const toolCall = response.choices[0].message.tool_calls[0];
        try {
          const functionArgs = (toolCall as any).function?.arguments || '{}';
          result = JSON.parse(functionArgs);
        } catch (parseError) {
          console.error(`[OpenAI] Session ${sessionId}: Tool arguments parse failed:`, parseError);
          result = {
            message: 'Prepáčte, nastala chyba pri spracovaní vašej správy. Skúste neskôr alebo nás kontaktujte na +421 917 795 731.',
            needsOrderProcessing: false,
            intent: 'general'
          };
        }
      } else {
        console.error(`[OpenAI] Session ${sessionId}: No tool call received`);
        result = {
          message: 'Prepáčte, nastala chyba pri spracovaní vašej správy. Skúste neskôr alebo nás kontaktujte na +421 917 795 731.',
          needsOrderProcessing: false,
          intent: 'general'
        };
      }
      
      // Server-side safeguard in case schema enforcement fails
      const safeMessage = result.message || 'Ďakujem za otázku! Máme širokú ponuku zákuskov a torty. Pre podrobný zoznam navštívte náš obchod alebo zavolajte na +421 917 795 731.';
      const safeIntent = result.intent || 'info';
      const safeNeedsProcessing = result.needsOrderProcessing === true;
      
      // Fallback safeguard ensures users always get helpful responses
      
      return {
        message: safeMessage,
        needsOrderProcessing: safeNeedsProcessing,
        extractedIntent: safeIntent
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  private buildSystemPrompt(availableProducts?: Array<{ id: string; name: string; price: number; category: string }>): string {
    // Show limited products to prevent token overflow
    const limitedProducts = availableProducts?.slice(0, 15);
    const productsContext = limitedProducts && limitedProducts.length > 0
      ? `\n\nDostupné produkty (výber):\n${limitedProducts.map(p => `- ${p.name} - ${p.price.toFixed(2)}€${p.category === 'Zákusky' ? '/ks (min. 10ks)' : ''}`).join('\n')}\n${availableProducts && availableProducts.length > 15 ? `\n...a ďalších ${availableProducts.length - 15} produktov. Pre kompletný zoznam navštívte náš obchod.` : ''}`
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

POVINNÝ JSON FORMÁT ODPOVEDE:
{
  "message": "tvoja odpoveď v slovenčine (povinné pole)",
  "needsOrderProcessing": true alebo false,
  "intent": "order" alebo "info" alebo "general"
}

MUŠÍŠ VŽDY VRÁTIŤ VALIDNÝ JSON S POĽOM 'message'!`;
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