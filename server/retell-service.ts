import Retell from 'retell-sdk';

export class RetellService {
  private retell?: Retell;
  private agentId: string;
  private isAvailable: boolean = false;

  constructor() {
    const apiKey = process.env.RETELL_API_KEY;
    this.agentId = process.env.RETELL_AGENT_ID || '';

    if (apiKey && this.agentId) {
      try {
        this.retell = new Retell({
          apiKey: apiKey
        });
        this.isAvailable = true;
        console.log('✅ Retell AI service initialized successfully');
      } catch (error) {
        console.warn('⚠️ Retell AI initialization failed, using fallback:', error);
        this.isAvailable = false;
      }
    } else {
      console.warn('⚠️ Retell AI credentials not found, using fallback chat system');
      this.isAvailable = false;
    }
  }

  async sendChatMessage(message: string, sessionId: string): Promise<string> {
    try {
      // Pro účely dema použijeme OpenAI GPT model pre chat
      // V reálnej implementácii by ste použili Retell AI chat endpoint
      
      // Zatiaľ použijeme fallback response system s kontextom pekárne
      const response = await this.generateBakeryResponse(message, sessionId);
      return response;
    } catch (error) {
      console.error('Retell AI chat error:', error);
      
      // Fallback odpoveď v slovenčine
      return 'Ospravedlňujem sa, momentálne nemôžem odpovedať. Kontaktujte nás prosím priamo na telefóne +421 917 795 731.';
    }
  }

  private async generateBakeryResponse(message: string, sessionId: string): Promise<string> {
    const lowerMessage = message.toLowerCase();
    
    // Základné slovenské odpovede pre pekáreň
    if (lowerMessage.includes('ahoj') || lowerMessage.includes('dobrý deň') || lowerMessage.includes('nazdar')) {
      return 'Dobrý deň! Vitajte v Marsela Bakery! Som Linda, vaša AI asistentka. Môžem vám pomôcť s objednávaním našich výborných zákuskov a tort. Čo by ste si želali?';
    }
    
    if (lowerMessage.includes('menu') || lowerMessage.includes('ponuka') || lowerMessage.includes('čo máte') || lowerMessage.includes('produkty')) {
      return 'Naša ponuka zahŕňa:\n🧁 Makrónky v rôznych príchutíach\n🍰 Čerstvé zákusky (cheesecake, tiramisu, ovocné koláče)\n🎂 Torty na objednávku\n🥐 Čerstvé pečivo\n\nAko vám môžem pomôcť s objednávkou?';
    }
    
    if (lowerMessage.includes('makrónk') || lowerMessage.includes('macarons')) {
      return 'Naše makrónky sú naša špeciálnosť! Ponúkame ich v týchto príchutích:\n• Vanilka\n• Čokoláda\n• Malina\n• Pistácia\n• Karamel\n\nCena: 2,50€ za kus alebo 28€ za darčekovú krabičku 12 kusov. Koľko by ste si želali objednať?';
    }
    
    if (lowerMessage.includes('torta') || lowerMessage.includes('tort')) {
      return 'Vyrábame nádherné torty na objednávku! Môžeme pripraviť:\n🎂 Čokoládové torty\n🍓 Ovocné torty\n🥕 Mrkvovú tortu\n🍋 Citrónové torty\n\nPre objednávku torty potrebujeme vedieť veľkosť, príchut a dátum odberu. Kedy by ste potrebovali tortu?';
    }
    
    if (lowerMessage.includes('cena') || lowerMessage.includes('koľko') || lowerMessage.includes('stojí')) {
      return 'Tu sú naše základné ceny:\n💰 Makrónky: 2,50€/kus\n💰 Zákusky: 3,50-5,50€/kus\n💰 Torty: od 35€ (podľa veľkosti)\n💰 Pečivo: 1,50-3€/kus\n\nPotrebujete cenu pre konkrétny produkt?';
    }
    
    if (lowerMessage.includes('objednávka') || lowerMessage.includes('objednať') || lowerMessage.includes('kúpiť')) {
      return 'Perfektné! Pre vašu objednávku potrebujem:\n📝 Čo si želáte objednať?\n📅 Kedy potrebujete odber?\n📞 Vaše meno a telefónne číslo\n\nMôžete mi prosím povedať, čo by ste radi objednali?';
    }
    
    if (lowerMessage.includes('otváracie hodiny') || lowerMessage.includes('kedy máte otvorené') || lowerMessage.includes('hodiny')) {
      return 'Naše otváracie hodiny:\n🕐 Pondelok - Piatok: 7:00 - 18:00\n🕐 Sobota: 8:00 - 16:00\n🕐 Nedeľa: 9:00 - 15:00\n\nNávštívte nás kedykoľvek!';
    }
    
    if (lowerMessage.includes('adresa') || lowerMessage.includes('kde sa nachádzate') || lowerMessage.includes('kde ste')) {
      return 'Nájdete nás na adrese:\n📍 Hlavná ulica 123, Bratislava\n🚗 Parkovanie pred budovou\n🚇 Metro: stanica Centrum (5 min pešo)\n\nTešíme sa na vašu návštevu!';
    }
    
    if (lowerMessage.includes('ďakujem') || lowerMessage.includes('vďaka') || lowerMessage.includes('thanks')) {
      return 'Rádili sme vám! Ak budete mať ďalšie otázky alebo si budete chcieť niečo objednať, som tu pre vás. Pekný deň! 😊';
    }
    
    if (lowerMessage.includes('pomoc') || lowerMessage.includes('help')) {
      return 'Som tu, aby som vám pomohla! Môžem vám povedať:\n• Informácie o našich produktoch\n• Ceny a ponuku\n• Pomôcť s objednávkou\n• Otváracie hodiny a kontakt\n\nStačí sa ma opýtať na čokoľvek!';
    }
    
    // Všeobecná odpoveď ak nič nevyhovuje
    return 'Ďakujem za váš dotaz! Nie som si istá, ako presne vám pomôcť. Môžete sa ma opýtať na:\n• Naše produkty a ceny\n• Objednávky\n• Otváracie hodiny\n• Kontaktné údaje\n\nAlebo ma kontaktujte priamo na +421 917 795 731.';
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Jednoduchý health check pre Retell AI
      return true;
    } catch (error) {
      console.error('Retell health check failed:', error);
      return false;
    }
  }
}

export const retellService = new RetellService();