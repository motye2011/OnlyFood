'use client';
import { useState } from 'react';
import { placeOrder } from './actions';

type Product = { id: string; nombre: string; descripcion: string | null; precio: number; categoria: string; imagenUrl: string | null };
type CartItem = { product: Product; cantidad: number };

export default function MenuClient({
  mesa,
  restaurant,
  categories,
  products,
  sessionToken,
}: {
  mesa: { id: string; numero: number; nombre: string | null; token: string };
  restaurant: { id: string; nombre: string; slug: string };
  categories: { id: string; nombre: string }[];
  products: Product[];
  sessionToken: string;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filter, setFilter] = useState<string>('Todos');
  const [sending, setSending] = useState(false);
  const [orderResult, setOrderResult] = useState<{ numero: number; total: number } | null>(null);

  const filtered = filter === 'Todos' ? products : products.filter((p) => p.categoria === filter);
  const total = cart.reduce((s, i) => s + i.product.precio * i.cantidad, 0);

  function add(p: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].cantidad += 1;
        return copy;
      }
      return [...prev, { product: p, cantidad: 1 }];
    });
  }
  function remove(id: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== id));
  }

  async function handleOrder() {
    if (cart.length === 0) return;
    setSending(true);
    const res = await placeOrder({
      mesaId: mesa.id,
      restaurantId: restaurant.id,
      sessionToken,
      items: cart.map((c) => ({ productId: c.product.id, cantidad: c.cantidad })),
    });
    setSending(false);
    if (res?.success) {
      setOrderResult({ numero: res.numero ?? 0, total: res.total ?? 0 });
      setCart([]);
    } else {
      alert('Error al crear pedido: ' + res?.error);
    }
  }

  if (orderResult) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-2">✅</div>
          <h1 className="text-2xl font-bold mb-2">Pedido #{orderResult.numero} enviado</h1>
          <p className="text-zinc-400 text-sm mb-1">Mesa {mesa.numero} — {mesa.nombre}</p>
          <p className="text-zinc-400 text-sm mb-4">Total: ${orderResult.total.toLocaleString()} • Estado: nuevo</p>
          <p className="text-xs text-zinc-500 mb-6">El restaurante lo ve en Panel → Pedidos como “Mesa {mesa.numero} — {cart.length} items”. Podrás pedir de nuevo escaneando el mismo QR.</p>
          <button onClick={() => setOrderResult(null)} className="bg-white text-black px-6 py-2 rounded font-medium text-sm">Hacer otro pedido</button>
          <div className="mt-4 text-xs text-zinc-600">QR = mesa {mesa.numero} • sesión {sessionToken.slice(0,8)}...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="font-bold">{restaurant.nombre}</h1>
            <p className="text-xs text-zinc-400">Mesa {mesa.numero} — {mesa.nombre} • Menú digital</p>
          </div>
          <div className="text-xs bg-zinc-800 px-2 py-1 rounded">QR: {mesa.token.slice(0,6)}...</div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button onClick={() => setFilter('Todos')} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${filter==='Todos'?'bg-white text-black':'bg-zinc-800 text-zinc-300'}`}>Todos</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setFilter(c.nombre)} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${filter===c.nombre?'bg-white text-black':'bg-zinc-800 text-zinc-300'}`}>{c.nombre}</button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-20">
          {filtered.map((p) => (
            <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex justify-between">
              <div>
                <div className="font-medium text-sm">{p.nombre}</div>
                <div className="text-xs text-zinc-400 line-clamp-2">{p.descripcion}</div>
                <div className="text-sm font-bold mt-1">${p.precio.toLocaleString()}</div>
                <div className="text-[11px] text-zinc-600">{p.categoria} • 3D próximamente</div>
              </div>
              <button onClick={() => add(p)} className="bg-white text-black h-8 px-3 rounded text-sm font-medium self-center">Agregar</button>
            </div>
          ))}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-sm font-semibold mb-2">Carrito — Mesa {mesa.numero} ({cart.length} productos)</div>
            <div className="space-y-1 mb-3 max-h-32 overflow-auto">
              {cart.map((i) => (
                <div key={i.product.id} className="flex justify-between text-sm bg-zinc-950 p-2 rounded">
                  <span>{i.cantidad}x {i.product.nombre}</span>
                  <span className="flex gap-2">${(i.product.precio * i.cantidad).toLocaleString()} <button onClick={() => remove(i.product.id)} className="text-red-400 text-xs">x</button></span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold">Total: ${total.toLocaleString()}</span>
              <button onClick={handleOrder} disabled={sending} className="bg-green-500 text-black px-6 py-2 rounded font-bold text-sm disabled:opacity-50">
                {sending ? 'Enviando...' : `Pedir — Mesa ${mesa.numero}`}
              </button>
            </div>
            <div className="text-[11px] text-zinc-500 mt-2">Al confirmar, llega al panel como “Mesa {mesa.numero} — {cart.length} items”</div>
          </div>
        </div>
      )}
    </div>
  );
}
