import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

async function updateEstado(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const estado = formData.get('estado') as string;
  await prisma.order.update({ where: { id }, data: { estado: estado as any } });
  revalidatePath('/panel/pedidos');
  revalidatePath('/panel');
}

export default async function PedidosPage() {
  const orders = await prisma.order.findMany({
    where: { restaurantId: RESTAURANT_ID },
    include: { mesa: true, items: { include: { extras: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const grouped = {
    nuevo: orders.filter((o) => o.estado === 'nuevo'),
    en_preparacion: orders.filter((o) => o.estado === 'en_preparacion'),
    listo: orders.filter((o) => o.estado === 'listo'),
    entregado: orders.filter((o) => o.estado === 'entregado'),
  };

  const Column = ({ title, orders, next }: any) => (
    <div className="bg-white border border-[#e8d5d0] rounded-lg p-3">
      <h3 className="font-light text-sm mb-3 flex justify-between text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>
        {title} <span className="bg-[#fdfbf7] border border-[#e8d5d0] px-2 py-0.5 rounded text-xs">{orders.length}</span>
      </h3>
      <div className="space-y-3">
        {orders.map((o: any) => (
          <div key={o.id} className="bg-[#fdfbf7] border border-[#e8d5d0] rounded p-3">
            <div className="flex justify-between text-sm font-medium text-[#1a1a1a]">
              <span>#{o.numero} — M{o.mesa.numero}</span>
              <span className="text-[#9a8a86]">${Number(o.total).toLocaleString()}</span>
            </div>
            <div className="text-xs text-[#9a8a86] mt-1">{o.items.length} items • {new Date(o.createdAt).toLocaleTimeString()}</div>
            <ul className="text-xs mt-2 space-y-1 text-[#5a4a47]">
              {o.items.map((it: any) => (
                <li key={it.id} className="flex justify-between">
                  <span>{it.cantidad}x {it.productNombre}</span>
                  <span>${Number(it.subtotal).toLocaleString()}</span>
                </li>
              ))}
            </ul>
            {o.notas && <div className="text-xs bg-[#fef3c7] text-[#92400e] mt-2 p-1.5 rounded">Nota: {o.notas}</div>}
            {next && (
              <form action={updateEstado} className="mt-3">
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="estado" value={next} />
                <button className="w-full bg-[#1a1a1a] text-[#fdfbf7] text-xs py-1.5 rounded font-medium hover:bg-black">
                  → {next.replace('_', ' ')}
                </button>
              </form>
            )}
            {o.estado === 'listo' && (
              <form action={updateEstado} className="mt-3">
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="estado" value="entregado" />
                <button className="w-full bg-[#7a9e7e] text-white text-xs py-1.5 rounded font-medium">✓ Entregado</button>
              </form>
            )}
          </div>
        ))}
        {orders.length === 0 && <div className="text-xs text-[#9a8a86] text-center py-4">Vacío</div>}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <h1 className="text-2xl font-light tracking-wide text-[#1a1a1a] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Pedidos</h1>
      <p className="text-[#9a8a86] text-sm mb-6">Flujo: nuevo → en_preparacion → listo → entregado</p>
      <div className="grid md:grid-cols-4 gap-4">
        <Column title="Nuevo" orders={grouped.nuevo} next="en_preparacion" />
        <Column title="En preparación" orders={grouped.en_preparacion} next="listo" />
        <Column title="Listo" orders={grouped.listo} next={null} />
        <Column title="Entregado" orders={grouped.entregado} next={null} />
      </div>
    </div>
  );
}
