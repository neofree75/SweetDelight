export function ChatWidget() {
  return (
    <>
      {/* N8N Chat iframe - isolates Vue.js from React */}
      <iframe
        src="/n8n-chat.html"
        data-testid="chat-widget"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '100vw',
          height: '100vh',
          border: 'none',
          zIndex: 9999,
          pointerEvents: 'auto', // Enable clicks on chat elements
          background: 'transparent'
        }}
        title="Linda AI Asistentka"
      />
    </>
  );
}