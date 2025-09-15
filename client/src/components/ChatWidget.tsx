import { useEffect } from 'react';

export function ChatWidget() {
  useEffect(() => {
    // Ak už máme inštanciu, skonči
    if (window.n8nChatInstance) {
      return;
    }
    
    // Pridaj minimálne CSS štýly  
    const addChatStyles = () => {
      const existingStyle = document.getElementById('n8n-chat-custom-styles');
      if (existingStyle) return;
      
      const style = document.createElement('style');
      style.id = 'n8n-chat-custom-styles';
      style.textContent = `
        #n8n-chat {
          position: fixed !important;
          bottom: 0 !important;
          right: 0 !important;
          z-index: 9999 !important;
        }
        
        /* Len zväčšenie ikony */
        #n8n-chat [role="button"] {
          width: 70px !important;
          height: 70px !important;
        }
        
        #n8n-chat [role="button"] svg {
          width: 32px !important;
          height: 32px !important;
        }
      `;
      
      document.head.appendChild(style);
    };
    
    // Načítaj n8n chat script jednorazovo
    const loadChatScript = () => {
      if (document.getElementById('n8n-chat-script')) {
        return;
      }
      
      const script = document.createElement('script');
      script.id = 'n8n-chat-script';
      script.src = 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.umd.js';
      script.defer = true;
      
      script.onload = () => {
        if (window.createChat && !window.n8nChatInstance) {
          try {
            window.n8nChatInstance = window.createChat({
              webhookUrl: '/api/chat',
              target: '#n8n-chat',
              mode: 'window',
              chatInputKey: 'chatInput',
              chatSessionKey: 'sessionId',
              loadPreviousSession: true,
              showWelcomeScreen: false,
              defaultLanguage: 'sk',
              initialMessages: [
                'Ahoj!',
                'Moje meno je Linda a som AI asistentka. Viem rezervovať zákusky a torty ...'
              ],
              i18n: {
                sk: {
                  title: 'Ahoj!',
                  subtitle: 'Začnite chat. Sme tu pre vás 24/7.',
                  footer: '',
                  getStarted: 'Nová konverzácia',
                  inputPlaceholder: 'Napíšte svoju otázku..',
                }
              },
              enableStreaming: false
            });
            
            console.log('N8N Chat loaded successfully');
          } catch (error) {
            console.error('Failed to initialize N8N Chat:', error);
          }
        }
      };
      
      script.onerror = () => {
        console.error('Failed to load N8N Chat script');
      };
      
      document.head.appendChild(script);
    };

    addChatStyles();
    loadChatScript();

    // Cleanup len štýly pri unmount
    return () => {
      const styles = document.getElementById('n8n-chat-custom-styles');
      if (styles) {
        styles.remove();
      }
    };
  }, []);

  return (
    <div 
      id="n8n-chat" 
      data-testid="chat-root"
      style={{ 
        position: 'fixed',
        bottom: 0,
        right: 0,
        zIndex: 9999 
      }}
    />
  );
}

// Rozšír window type pre TypeScript
declare global {
  interface Window {
    n8nChatInstance: any;
    createChat: any;
  }
}