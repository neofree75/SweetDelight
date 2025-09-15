import { useEffect } from 'react';

export function ChatWidget() {
  useEffect(() => {
    // Pridaj custom CSS pre n8n chat widget
    const addChatStyles = () => {
      const existingStyle = document.getElementById('n8n-chat-custom-styles');
      if (existingStyle) return;
      
      const style = document.createElement('style');
      style.id = 'n8n-chat-custom-styles';
      style.textContent = `
        /* N8N Chat custom styles */
        [data-n8n-chat] .chat-widget-trigger {
          width: 70px !important;
          height: 70px !important;
          border-radius: 35px !important;
        }
        
        [data-n8n-chat] .chat-widget-trigger svg {
          width: 32px !important;
          height: 32px !important;
        }
        
        /* Chat window styling */
        [data-n8n-chat] .chat-window {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        
        [data-n8n-chat] .chat-input {
          font-family: inherit !important;
        }
        
        /* Ensure chat is above other elements */
        [data-n8n-chat] {
          z-index: 9999 !important;
        }
      `;
      
      document.head.appendChild(style);
    };
    
    // Načítaj n8n chat script dynamicky
    const loadChatScript = () => {
      // Skontroluj či už script nie je načítaný
      if (document.getElementById('n8n-chat-script')) {
        return;
      }

      const script = document.createElement('script');
      script.id = 'n8n-chat-script';
      script.type = 'module';
      script.textContent = `
        import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';
        
        if (window.n8nChatInstance) {
          // Ak už existuje instancia, zruš ju
          try {
            window.n8nChatInstance.destroy?.();
          } catch (e) {
            console.log('Chat cleanup:', e);
          }
        }
        
        try {
          window.n8nChatInstance = createChat({
            webhookUrl: '/api/chat',
            target: '#n8n-chat',
            mode: 'window',
            chatInputKey: 'chatInput',
            chatSessionKey: 'sessionId',
            loadPreviousSession: true,
            metadata: {},
            showWelcomeScreen: false,
            defaultLanguage: 'sk',
            initialMessages: [
              'Ahoj!',
              'Moje meno je Linda a som AI asistentka. Viem rezervovať zákusky a torty ...'
            ],
            i18n: {
              en: {
                title: 'Hi there!',
                subtitle: "Start a chat. We're here to help you 24/7.",
                footer: '',
                getStarted: 'New Conversation',
                inputPlaceholder: 'Type your question..',
              },
              sk: {
                title: 'Ahoj!',
                subtitle: "Začnite chat. Sme tu, aby sme vám pomohli 24 hodín denne, 7 dní v týždni.",
                footer: '',
                getStarted: 'Nová konverzácia',
                inputPlaceholder: 'Napíšte svoju otázku..',
              },
            },
            enableStreaming: false,
          });
          
          console.log('N8N Chat loaded successfully');
        } catch (error) {
          console.error('Failed to initialize N8N Chat:', error);
          
          // Zobraz fallback správu ak sa chat nepodarí načítať
          const chatContainer = document.getElementById('n8n-chat');
          if (chatContainer) {
            chatContainer.innerHTML = \`
              <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
                color: #64748b;
                max-width: 300px;
                z-index: 9999;
              ">
                Chat služba je momentálne nedostupná. 
                <br>
                <a href="/kontakt" style="color: #3b82f6; text-decoration: underline;">
                  Kontaktujte nás priamo
                </a>
              </div>
            \`;
          }
        }
      `;

      document.head.appendChild(script);
    };

    // Pridaj štýly a načítaj script po mount komponenty
    addChatStyles();
    loadChatScript();

    // Cleanup pri unmount
    return () => {
      if (window.n8nChatInstance) {
        try {
          window.n8nChatInstance.destroy?.();
          window.n8nChatInstance = null;
        } catch (e) {
          console.log('Chat cleanup error:', e);
        }
      }
      
      // Odstráň script a štúly z DOM
      const script = document.getElementById('n8n-chat-script');
      if (script) {
        script.remove();
      }
      
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
  }
}