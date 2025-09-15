import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Ahoj! Moje meno je Linda a som AI asistentka. Viem rezervovať zákusky a torty. Ako vám môžem pomôcť?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputValue,
          sessionId: 'chat-widget-' + Date.now(),
          metadata: {
            source: 'chat-widget',
            timestamp: new Date().toISOString()
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Chyba pri komunikácii so serverom');
      }
      
      const data = await response.json();
      
      const botMessage: ChatMessage = {
        id: Date.now().toString() + '-bot',
        text: data.message || 'Ďakujem za vašu správu. Kontaktujte nás na telefóne +421 917 795 731 alebo emaile marcelabakery@gmail.com pre viac informácií.',
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        text: 'Prepáčte, došlo k chybe. Môžete nás kontaktovať priamo na +421 917 795 731 alebo marcelabakery@gmail.com',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <div 
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '70px',
          height: '70px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '35px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          transition: 'all 0.2s ease',
          border: '3px solid rgba(255,255,255,0.2)',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = isOpen ? 'scale(0.9)' : 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }}
        onClick={() => setIsOpen(!isOpen)}
        title="Linda AI asistentka"
        data-testid="chat-toggle-button"
      >
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="white"
          style={{
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          {isOpen ? (
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          ) : (
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          )}
        </svg>
        
        {!isOpen && (
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            right: '-8px',
            background: '#4ade80',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: 'white',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
          </div>
        )}
      </div>
      
      {/* Chat Window */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '20px',
            width: '350px',
            height: '500px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}
          data-testid="chat-window"
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div>Linda AI Asistentka</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Online</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '20px',
                width: '30px',
                height: '30px',
                borderRadius: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
              data-testid="chat-close-button"
            >
              ×
            </button>
          </div>
          
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            background: '#f9fafb'
          }}>
            {messages.map((message) => (
              <div 
                key={message.id}
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: message.isUser ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: '18px',
                  background: message.isUser 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'white',
                  color: message.isUser ? 'white' : '#374151',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: message.isUser ? 'none' : '1px solid #e5e7eb'
                }}>
                  {message.text}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div style={{
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'flex-start'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '18px',
                  background: 'white',
                  color: '#6b7280',
                  fontSize: '14px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: '1px solid #e5e7eb'
                }}>
                  Linda píše...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            background: 'white'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Napíšte svoju správu..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '24px',
                  fontSize: '14px',
                  outline: 'none',
                  background: isLoading ? '#f3f4f6' : 'white'
                }}
                data-testid="chat-input"
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '24px',
                  border: 'none',
                  background: inputValue.trim() && !isLoading
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : '#d1d5db',
                  color: 'white',
                  cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                data-testid="chat-send-button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS Keyframes */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}