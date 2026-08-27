import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import QRCode from 'qrcode';

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

async function deleteMesa(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  try {
    await prisma.mesa.delete({ where: { id } });
  } catch (e) {
    console.error('No se puede borrar mesa con pedidos', e);
  }
  revalidatePath('/panel/mesas');
}

async function regenerateQR(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  await prisma.$executeRaw`UPDATE mesas SET qr_token = encode(gen_random_bytes(16), 'hex'), updated_at = now() WHERE id = ${id}::uuid`;
  revalidatePath('/panel/mesas');
}

export default async function MesasPage() {
  const mesas = await prisma.mesa.findMany({ where: { restaurantId: RESTAURANT_ID }, orderBy: { numero: 'asc' } });

  // Generar QR dataURL para cada mesa
  const mesasConQR = await Promise.all(
    mesas.map(async (m) => {
      const url = `http://192.168.1.2:3000/menu/${m.qrToken}`;
      const qrDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
      return { ...m, qrUrl: url, qrDataUrl };
    })
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Mesas / QR</h1>
      <p className="text-zinc-500 text-sm mb-6">{mesas.length} mesas • QR estático por mesa (no cambia al editar menú) • Regenerar solo si se pierde el impreso</p>

      <form action={createMesa} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg mb-6 flex gap-3 flex-wrap">
        <input name="numero" placeholder="Número" type="number" required className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm w-24" />
        <input name="nombre" placeholder="Nombre (opcional)" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm flex-1" />
        <input name="capacidad" placeholder="Cap" type="number" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm w-20" />
        <button type="submit" className="bg-white text-black rounded px-4 py-2 text-sm font-medium">Crear mesa</button>
      </form>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mesasConQR.map((m) => (
          <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-bold">{m.nombre}</div>
                <div className="text-xs text-zinc-500">Número {m.numero} • Cap {m.capacidad}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded font-medium ${m.estado==='libre'?'bg-green-500 text-black':m.estado==='ocupada'?'bg-red-500 text-white':'bg-zinc-700'}`}>{m.estado}</span>
            </div>
            <div className="bg-white p-3 rounded flex flex-col items-center mb-3">
              <img src={m.qrDataUrl} alt={`QR Mesa ${m.numero}`} className="w-40 h-40" />
              <div className="text-[10px] text-zinc-500 mt-1">Mesa {m.numero} — escanea para pedir</div>
            </div>
            <div className="text-xs space-y-1">
              <div className="text-zinc-400">URL menú:</div>
              <code className="bg-zinc-950 border border-zinc-800 px-2 py-1 rounded block text-[11px] break-all">{m.qrUrl}</code>
              <div className="text-[11px] text-zinc-600 break-all">Token: {m.qrToken}</div>
            </div>
            <div className="flex gap-2 mt-3">
              <a href={m.qrUrl} target="_blank" className="flex-1 text-center bg-zinc-800 hover:bg-zinc-700 text-xs py-1.5 rounded">Abrir menú</a>
              <a href={m.qrDataUrl} download={`qr-mesa-${m.numero}.png`} className="flex-1 text-center bg-zinc-800 hover:bg-zinc-700 text-xs py-1.5 rounded">Descargar QR</a>
            </div>
            <div className="flex gap-2 mt-2">
              <form action={regenerateQR} className="flex-1">
                <input type="hidden" name="id" value={m.id} />
                <button className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-xs py-1.5 rounded">Regenerar QR</button>
              </form>
              <form action={deleteMesa} className="flex-1">
                <input type="hidden" name="id" value={m.id} />
                <button className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs py-1.5 rounded">Borrar</button>
              </form>
            </div>
            <div className="text-[11px] text-zinc-600 mt-2">QR = mesa {m.numero} — al escanear → /menu/{m.qrToken.slice(0,8)}... → pedido llega como “Mesa {m.numero}”</div>
          </div>
        ))}
      </div>
      {mesas.length===0 && <div className="text-center text-zinc-500 py-8">Sin mesas. Crea la Mesa 1 para probar QR → menú → pedido.</div>}
    </div>
  );
}
