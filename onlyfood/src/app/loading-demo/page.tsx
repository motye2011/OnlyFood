'use client';
import { useState } from 'react';
import LoadingScreen from '@/components/LoadingScreen';

export default function LoadingDemo() {
  const [show, setShow] = useState(true);
  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center p-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      {show && <LoadingScreen onDone={() => setShow(false)} />}
      {!show && (
        <div className="text-center">
          <h1 className="text-3xl font-light tracking-wide text-[#1a1a1a] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Carga completa</h1>
          <p className="text-sm text-[#9a8a86] mb-6">Panel OnlyFood listo</p>
          <button onClick={() => setShow(true)} className="border border-[#1a1a1a] text-[#1a1a1a] px-6 py-2 text-xs tracking-[0.2em] hover:bg-[#1a1a1a] hover:text-[#fdfbf7] transition">VER DE NUEVO</button>
          <div className="mt-8 text-xs text-[#9a8a86]">Ruta: <code className="bg-white px-1 py-0.5 rounded">/loading-demo</code> • Componente: <code className="bg-white px-1 py-0.5 rounded">src/components/LoadingScreen.tsx</code></div>
          <a href="/panel" className="inline-block mt-4 text-xs text-[#c9a098] hover:text-[#1a1a1a]">→ Ir al panel</a>
        </div>
      )}
    </div>
  );
}
