'use client';
import { useState, useRef, useEffect } from 'react';

export default function LunaChat() {
  const [messages, setMessages] = useState<{ role: 'user' | 'luna'; text: string }[]>([
    { role: 'luna', text: 'Hola, soy Luna-Worker. Di "luna" y luego tu orden, ej: "luna manda todos los pendientes a cocina" o escribe abajo.' },
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [wakeActive, setWakeActive] = useState(false);
  const recognitionRef = useRef<any>(null);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    const res = await fetch('/api/luna/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: messages.map((mm) => ({ role: mm.role === 'user' ? 'user' : 'model', content: mm.text })) }),
    });
    const data = await res.json();
    const reply = data.text || data.error || 'Error';
    setMessages((m) => [...m, { role: 'luna', text: reply }]);
    // Voz
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(reply);
      utter.lang = 'es-CO';
      utter.rate = 1;
      window.speechSynthesis.speak(utter);
    }
  }

  function toggleListen() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta voz. Usa Chrome/Edge.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setWakeActive(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'es-CO';
    rec.continuous = true;
    rec.interimResults = false;
    recognitionRef.current = rec;
    setListening(true);
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(' ').toLowerCase();
      console.log('transcript', transcript);
      if (transcript.includes('luna')) {
        setWakeActive(true);
        // Extrae comando después de "luna"
        const idx = transcript.lastIndexOf('luna');
        const command = transcript.slice(idx + 4).trim();
        if (command.length > 3) {
          sendMessage(command);
          setTimeout(() => setWakeActive(false), 3000);
        }
        // vibra
        if (navigator.vibrate) navigator.vibrate(100);
      }
    };
    rec.onend = () => {
      if (listening) {
        try { rec.start(); } catch {}
      }
    };
    rec.start();
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Chat con Luna</h3>
        <button onClick={toggleListen} className={`px-3 py-1.5 rounded-full text-xs font-medium ${listening ? (wakeActive ? 'bg-green-500 text-black animate-pulse' : 'bg-yellow-500 text-black') : 'bg-zinc-800 text-white'}`}>
          {listening ? (wakeActive ? '● Luna activa' : '● Escuchando "luna"...') : '🎤 Activar voz "luna"'}
        </button>
      </div>
      <div className="bg-zinc-950 border border-zinc-800 rounded h-64 overflow-auto p-3 space-y-2 mb-3">
        {messages.map((m, i) => (
          <div key={i} className={`p-2 rounded text-sm max-w-[85%] ${m.role === 'user' ? 'bg-white text-black ml-auto' : 'bg-zinc-800 text-white'}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder='Escribe o di "luna manda pendientes a cocina"...'
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm"
        />
        <button onClick={() => sendMessage(input)} className="bg-white text-black px-4 py-2 rounded text-sm font-medium">Enviar</button>
      </div>
      <div className="text-[11px] text-zinc-500 mt-2">
        Voz: Chrome/Edge + micrófono permitido. Di <b>"luna"</b> + orden. Texto: funciona sin voz. Tools: get_top_productos(20 días), update_pedidos_bulk, update_precio.
      </div>
    </div>
  );
}
