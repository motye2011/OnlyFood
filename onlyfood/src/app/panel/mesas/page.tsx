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
  // Borrado con cascada manual: limpia dependencias y luego mesa
  await prisma.mesaSession.deleteMany({ where: { mesaId: id } });
  await prisma.qrScan.deleteMany({ where: { mesaId: id } });
  await prisma.productView.deleteMany({ where: { mesaId: id } });
  // Borra pedidos de esa mesa (y sus items por cascade)
  const orders = await prisma.order.findMany({ where: { mesaId: id }, select: { id: true } });
  for (const o of orders) {
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: o.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
    await prisma.order.delete({ where: { id: o.id } });
  }
  await prisma.mesa.delete({ where: { id } });
  revalidatePath('/panel/mesas');
  revalidatePath('/panel');
}

async function regenerateQR(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  await prisma.$executeRaw`UPDATE mesas SET qr_token = encode(gen_random_bytes(16), 'hex'), updated_at = now() WHERE id = ${id}::uuid`;
  revalidatePath('/panel/mesas');
}

export default async function MesasPage() {
  const mesas = await prisma.mesa.findMany({ where: { restaurantId: RESTAURANT_ID }, orderBy: { numero: 'asc' } });
  const mesasConQR = await Promise.all(
    mesas.map(async (m) => {
      const url = `http://192.168.1.2:3000/menu/${m.qrToken}`;
      const qrDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
      return { ...m, qrUrl: url, qrDataUrl };
    })
  );

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <h1 className="text-2xl font-light tracking-wide text-[#1a1a1a] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Mesas / QR</h1>
      <p className="text-[#9a8a86] text-sm mb-6">{mesas.length} mesas • QR estático por mesa</p>

      <form action={createMesa} className="bg-white border border-[#e8d5d0] p-4 rounded-lg mb-6 flex gap-3 flex-wrap">
        <input name="numero" placeholder="Número" type="number" required className="bg-[#fdfbf7] border border-[#e8d5d0] rounded px-3 py-2 text-sm w-24" />
        <input name="nombre" placeholder="Nombre (opcional)" className="bg-[#fdfbf7] border border-[#e8d5d0] rounded px-3 py-2 text-sm flex-1" />
        <input name="capacidad" placeholder="Cap" type="number" className="bg-[#fdfbf7] border border-[#e8d5d0] rounded px-3 py-2 text-sm w-20" />
        <button type="submit" className="bg-[#1a1a1a] text-[#fdfbf7] rounded px-4 py-2 text-sm font-medium">Crear mesa</button>
      </form>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mesasConQR.map((m) => (
          <div key={m.id} className="bg-white border border-[#e8d5d0] rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-medium text-[#1a1a1a]">{m.nombre}</div>
                <div className="text-xs text-[#9a8a86]">Número {m.numero} • Cap {m.capacidad}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded font-medium ${m.estado==='libre'?'bg-[#dcfce7] text-[#166534]':m.estado==='ocupada'?'bg-[#fee2e2] text-[#991b1b]':'bg-[#e8d5d0] text-[#5a4a47]'}`}>{m.estado}</span>
            </div>
            <div className="bg-white border border-[#e8d5d0] p-3 rounded flex flex-col items-center mb-3">
              <img src={m.qrDataUrl} alt={`QR Mesa ${m.numero}`} className="w-40 h-40" />
              <div className="text-[10px] text-[#9a8a86] mt-1">Mesa {m.numero} — escanea para pedir</div>
            </div>
            <div className="text-xs space-y-1">
              <div className="text-[#9a8a86]">URL menú:</div>
              <code className="bg-[#fdfbf7] border border-[#e8d5d0] px-2 py-1 rounded block text-[11px] break-all text-[#5a4a47]">{m.qrUrl}</code>
            </div>
            <div className="flex gap-2 mt-3">
              <a href={m.qrUrl} target="_blank" className="flex-1 text-center bg-[#fdfbf7] border border-[#e8d5d0] hover:bg-white text-xs py-1.5 rounded text-[#1a1a1a]">Abrir menú</a>
              <a href={m.qrDataUrl} download={`qr-mesa-${m.numero}.png`} className="flex-1 text-center bg-[#fdfbf7] border border-[#e8d5d0] hover:bg-white text-xs py-1.5 rounded text-[#1a1a1a]">Descargar QR</a>
            </div>
            <div className="flex gap-2 mt-2">
              <form action={regenerateQR} className="flex-1">
                <input type="hidden" name="id" value={m.id} />
                <button className="w-full bg-[#fef3c7] hover:bg-[#fde68a] text-[#92400e] text-xs py-1.5 rounded border border-[#fcd34d]">Regenerar QR</button>
              </form>
              <form action={deleteMesa} className="flex-1">
                <input type="hidden" name="id" value={m.id} />
                <button className="w-full bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] text-xs py-1.5 rounded border border-[#fca5a5]">Borrar</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
