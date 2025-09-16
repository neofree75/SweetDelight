import { useEffect, useState } from 'react';

export function ChatWidget() {
  const [retellConfig, setRetellConfig] = useState<{publicKey: string, agentId: string} | null>(null);

  useEffect(() => {
    // Fetch Retell configuration from backend
    fetch('/api/retell-config')
      .then(res => res.json())
      .then(config => setRetellConfig(config))
      .catch(err => console.error('Failed to load Retell config:', err));
  }, []);

  useEffect(() => {
    if (!retellConfig) return;

    // Check if Retell script is already loaded
    if (document.getElementById('retell-widget')) {
      return;
    }

    // Create and load Retell AI widget script
    const script = document.createElement('script');
    script.id = 'retell-widget';
    script.src = 'https://dashboard.retellai.com/retell-widget.js';
    script.type = 'module';
    script.setAttribute('data-public-key', retellConfig.publicKey);
    script.setAttribute('data-agent-id', retellConfig.agentId);
    script.setAttribute('data-agent-version', '0');
    script.setAttribute('data-title', 'Linda AI Asistentka');
    script.setAttribute('data-color', '#667eea'); // Purple gradient main color

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      const existingScript = document.getElementById('retell-widget');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [retellConfig]);

  return null; // Retell widget is injected directly into DOM
}