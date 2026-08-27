import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

async function createMesa(formData: FormData) {
  'use server';
  const numero = parseInt(formData.get('numero') as string);
  const nombre = (formData.get('nombre') as string) || `Mesa ${numero}`;
  const capacidad = parseInt(formData.get('capacidad') as string) || 4;
  if (!numero) return;
  await prisma.mesa.create({ data: { restaurantId: RESTAURANT_ID, numero, nombre, capacidad } });
  revalidatePath('/panel/mesas');
}

export default async function MesasPage() {
  const mesas = await prisma.mesa.findMany({ where: { restaurantId: RESTAURANT_ID }, orderBy: { numero: 'asc' } });
  const restaurant = await prisma.restaurant.findUnique({ where: { id: RESTAURANT_ID } });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Mesas / QR</h1>
      <p className="text-zinc-500 text-sm mb-6">{mesas.length} mesas • QR estático por mesa (no cambia al editar menú)</p>

      <form action={createMesa} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg mb-6 flex gap-3 flex-wrap">
        <input name="numero" placeholder="Número" type="number" required className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm w-24" />
        <input name="nombre" placeholder="Nombre (opcional)" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm flex-1" />
        <input name="capacidad" placeholder="Cap" type="number" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm w-20" />
        <button type="submit" className="bg-white text-black rounded px-4 py-2 text-sm font-medium">Crear mesa</button>
      </form>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mesas.map((m) => {
          const qrUrl = `http://${restaurant?.slug ?? 'demo-onlyfood'}.local/menu/${m.qrToken}`;
          // Para demo local: 192.168.1.2:3000/menu/{qrToken}
          const localUrl = `http://192.168.1.2:3000/menu/${m.qrToken}`;
          return (
            <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold">{m.nombre}</div>
                  <div className="text-xs text-zinc-500">Número {m.numero} • Cap {m.capacidad}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${m.estado==='libre'?'bg-green-500 text-black':m.estado==='ocupada'?'bg-red-500 text-white':'bg-zinc-700'}`}>{m.estado}</span>
              </div>
              <div className="bg-white p-3 rounded flex items-center justify-center mb-3">
                <div className="text-center">
                  <div className="text-xs text-zinc-600">QR Token</div>
                  <code className="text-xs font-mono text-black break-all">{m.qrToken}</code>
                  <div className="text-[10px] text-zinc-500 mt-1">Escanea para pedir</div>
                </div>
              </div>
              <div className="text-xs space-y-1">
                <div className="text-zinc-400">URL menú:</div>
                <code className="bg-zinc-950 border border-zinc-800 px-2 py-1 rounded block text-[11px] break-all">{localUrl}</code>
              </div>
              <div className="text-[11px] text-zinc-600 mt-2">Tabla: mesas.qr_token (inmutable) + mesa_sessions para pedido</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
