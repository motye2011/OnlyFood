'use client';
import { useEffect, useState } from 'react';

export default function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 2200);
    const t2 = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-700 ${fade ? 'opacity-0' : 'opacity-100'}`}
      style={{ backgroundColor: '#fdfbf7', fontFamily: 'Playfair Display, Georgia, serif' }}
    >
      {/* Sutil textura */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(#1a1a1a 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
      
      <div className="relative flex flex-col items-center">
        {/* ONLYFOOD - espaciado amplio como DANIEL */}
        <h1 className="text-4xl md:text-5xl font-light tracking-[0.5em] md:tracking-[0.6em] text-[#1a1a1a] ml-[0.5em]">
          ONLYFOOD
        </h1>
        
        {/* Línea elegante - animada */}
        <div className="mt-4 h-[1px] w-48 md:w-56 bg-[#e8d5d0] overflow-hidden">
          <div className="h-full bg-[#c9a098] animate-[grow_1.8s_ease-out]" style={{ width: '100%' }} />
        </div>
        
        {/* Subtexto */}
        <p className="mt-3 text-[10px] tracking-[0.4em] text-[#9a8a86] font-light">
          PLATAFORMA 3D
        </p>
      </div>

      {/* Puntos de carga sutiles */}
      <div className="absolute bottom-12 flex gap-1.5">
        <span className="w-1 h-1 bg-[#c9a098] rounded-full animate-[bounce_1.4s_infinite_0ms]" />
        <span className="w-1 h-1 bg-[#c9a098] rounded-full animate-[bounce_1.4s_infinite_200ms]" />
        <span className="w-1 h-1 bg-[#c9a098] rounded-full animate-[bounce_1.4s_infinite_400ms]" />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400&family=Inter:wght@300&display=swap');
        @keyframes grow {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
