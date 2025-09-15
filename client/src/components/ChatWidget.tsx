import { useEffect } from 'react';

export function ChatWidget() {
  useEffect(() => {
    // Vytvor jednoduchý chat button ako fallback
    const createChatButton = () => {
      const chatContainer = document.getElementById('n8n-chat');
      if (!chatContainer || chatContainer.innerHTML) {
        return;
      }
      
      console.log('Creating fallback chat button...');
      
      chatContainer.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 35px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 9999;
          transition: all 0.2s ease;
          border: 3px solid rgba(255,255,255,0.2);
        " 
        onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)';" 
        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
        onclick="window.open('/kontakt', '_blank')"
        title="Kontaktujte nás - Linda AI asistentka">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          <div style="
            position: absolute;
            bottom: -8px;
            right: -8px;
            background: #4ade80;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 8px;
              height: 8px;
              background: white;
              border-radius: 50%;
              animation: pulse 2s infinite;
            "></div>
          </div>
        </div>
        
        <style>
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
            100% { opacity: 1; transform: scale(1); }
          }
        </style>
      `;
      
      console.log('Chat button created successfully');
    };

    // Krátke oneskorenie aby sa DOM ešte kompletne načítal
    const timer = setTimeout(createChatButton, 100);
    
    return () => {
      clearTimeout(timer);
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