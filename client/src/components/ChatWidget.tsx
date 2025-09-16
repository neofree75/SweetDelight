import { useEffect } from 'react';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';

export function ChatWidget() {
  useEffect(() => {
    // Create chat with custom styling to match existing design
    const chatInstance = createChat({
      webhookUrl: '/api/n8n-chat',
      target: '#n8n-chat-container',
      mode: 'window',
      chatInputKey: 'chatInput',
      chatSessionKey: 'sessionId', 
      loadPreviousSession: false,
      showWelcomeScreen: false,
      defaultLanguage: 'en',
      initialMessages: [
        'Ahoj! Moje meno je Linda a som AI asistentka.',
        'Viem rezervovať zákusky a torty. Ako vám môžem pomôcť?'
      ],
      i18n: {
        en: {
          title: 'Linda AI Asistentka',
          subtitle: 'Online - tu pre vás 24/7',
          footer: '',
          getStarted: 'Nová konverzácia',
          inputPlaceholder: 'Napíšte svoju správu...',
          closeButtonTooltip: 'Zavrieť chat'
        }
      },
      enableStreaming: false
    });

    return () => {
      // Cleanup if needed
      const chatContainer = document.getElementById('n8n-chat-container');
      if (chatContainer) {
        chatContainer.innerHTML = '';
      }
    };
  }, []);

  return (
    <>
      {/* N8N Chat container */}
      <div 
        id="n8n-chat-container" 
        data-testid="chat-widget"
        style={{ 
          position: 'fixed',
          bottom: 0,
          right: 0,
          zIndex: 9999 
        }}
      />
      
      {/* Custom CSS to match existing design */}
      <style>{`
        :root {
          /* Primary colors - matching the existing gradient */
          --chat--color-primary: #667eea;
          --chat--color-primary-shade-50: #5a67d8;
          --chat--color-primary-shade-100: #4c51bf;
          --chat--color-secondary: #764ba2;
          --chat--color-secondary-shade-50: #6b46c1;
          
          /* Base colors */
          --chat--color-white: #ffffff;
          --chat--color-light: #f9fafb;
          --chat--color-light-shade-50: #f3f4f6;
          --chat--color-light-shade-100: #e5e7eb;
          --chat--color-medium: #d1d5db;
          --chat--color-dark: #374151;
          --chat--color-disabled: #9ca3af;
          --chat--color-typing: #6b7280;

          /* Spacing and layout */
          --chat--spacing: 1rem;
          --chat--border-radius: 16px;
          --chat--transition-duration: 0.2s;

          /* Window dimensions */
          --chat--window--width: 350px;
          --chat--window--height: 500px;

          /* Header styling */
          --chat--header-height: auto;
          --chat--header--padding: 16px;
          --chat--header--background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --chat--header--color: #ffffff;
          --chat--header--border-top: none;
          --chat--header--border-bottom: none;
          --chat--heading--font-size: 16px;
          --chat--subtitle--font-size: 12px;
          --chat--subtitle--line-height: 1.4;

          /* Input styling */
          --chat--textarea--height: 48px;

          /* Message styling */
          --chat--message--font-size: 14px;
          --chat--message--padding: 12px 16px;
          --chat--message--border-radius: 18px;
          --chat--message-line-height: 1.4;
          --chat--message--bot--background: #ffffff;
          --chat--message--bot--color: #374151;
          --chat--message--bot--border: 1px solid #e5e7eb;
          --chat--message--user--background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --chat--message--user--color: #ffffff;
          --chat--message--user--border: none;
          --chat--message--pre--background: rgba(0, 0, 0, 0.05);

          /* Toggle button styling */
          --chat--toggle--background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --chat--toggle--hover--background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
          --chat--toggle--active--background: linear-gradient(135deg, #4c51bf 0%, #553c9a 100%);
          --chat--toggle--color: #ffffff;
          --chat--toggle--size: 70px;
        }

        /* Custom overrides for exact design match */
        #n8n-chat-container .chat-window {
          box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
          border: 1px solid #e5e7eb !important;
          bottom: 100px !important;
          right: 20px !important;
        }

        #n8n-chat-container .chat-toggle {
          bottom: 20px !important;
          right: 20px !important;
          border: 3px solid rgba(255,255,255,0.2) !important;
          transition: all 0.2s ease !important;
        }

        #n8n-chat-container .chat-toggle:hover {
          transform: scale(1.05) !important;
          box-shadow: 0 6px 20px rgba(0,0,0,0.3) !important;
        }

        #n8n-chat-container .chat-toggle.open {
          transform: scale(0.9) !important;
        }

        #n8n-chat-container .chat-messages {
          background: #f9fafb !important;
          padding: 16px !important;
        }

        #n8n-chat-container .chat-input-container {
          padding: 16px !important;
          border-top: 1px solid #e5e7eb !important;
          background: white !important;
        }

        #n8n-chat-container .chat-input {
          border-radius: 24px !important;
          border: 1px solid #d1d5db !important;
          padding: 12px 16px !important;
        }

        #n8n-chat-container .chat-send-button {
          border-radius: 24px !important;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          width: 48px !important;
          height: 48px !important;
          margin-left: 8px !important;
        }

        #n8n-chat-container .chat-send-button:disabled {
          background: #d1d5db !important;
        }

        /* Message bubbles spacing */
        #n8n-chat-container .chat-message {
          margin-bottom: 16px !important;
        }

        /* Typing indicator */
        #n8n-chat-container .chat-typing {
          color: #6b7280 !important;
          font-style: normal !important;
        }

        /* Green dot animation for online status */
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }

        #n8n-chat-container .chat-toggle:not(.open)::after {
          content: '';
          position: absolute;
          bottom: -8px;
          right: -8px;
          background: #4ade80;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          border: 2px solid white;
          animation: pulse 2s infinite;
        }

        #n8n-chat-container .chat-toggle:not(.open)::before {
          content: '';
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          z-index: 1;
        }
      `}</style>
    </>
  );
}