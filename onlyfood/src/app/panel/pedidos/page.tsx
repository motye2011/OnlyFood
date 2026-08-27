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

  const Column = ({ title, estado, orders, next }: any) => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <h3 className="font-semibold text-sm mb-3 flex justify-between">
        {title} <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs">{orders.length}</span>
      </h3>
      <div className="space-y-3">
        {orders.map((o: any) => (
          <div key={o.id} className="bg-zinc-950 border border-zinc-800 rounded p-3">
            <div className="flex justify-between text-sm font-medium">
              <span>#{o.numero} — M{o.mesa.numero}</span>
              <span className="text-zinc-400">${Number(o.total).toLocaleString()}</span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">{o.items.length} items • {new Date(o.createdAt).toLocaleTimeString()}</div>
            <ul className="text-xs mt-2 space-y-1">
              {o.items.map((it: any) => (
                <li key={it.id} className="flex justify-between">
                  <span>{it.cantidad}x {it.productNombre}</span>
                  <span>${Number(it.subtotal).toLocaleString()}</span>
                </li>
              ))}
            </ul>
            {o.notas && <div className="text-xs bg-yellow-500/10 text-yellow-300 mt-2 p-1.5 rounded">Nota: {o.notas}</div>}
            {next && (
              <form action={updateEstado} className="mt-3">
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="estado" value={next} />
                <button className="w-full bg-white text-black text-xs py-1.5 rounded font-medium hover:bg-zinc-200">
                  → {next.replace('_', ' ')}
                </button>
              </form>
            )}
            {o.estado === 'listo' && (
              <form action={updateEstado} className="mt-3">
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="estado" value="entregado" />
                <button className="w-full bg-green-500 text-black text-xs py-1.5 rounded font-medium">✓ Entregado</button>
              </form>
            )}
          </div>
        ))}
        {orders.length === 0 && <div className="text-xs text-zinc-600 text-center py-4">Vacío</div>}
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Pedidos</h1>
      <p className="text-zinc-500 text-sm mb-6">Flujo: nuevo → en_preparacion → listo → entregado • Realtime via trigger + mesa estado auto</p>

      <div className="grid md:grid-cols-4 gap-4">
        <Column title="Nuevo" estado="nuevo" orders={grouped.nuevo} next="en_preparacion" />
        <Column title="En preparación" estado="en_preparacion" orders={grouped.en_preparacion} next="listo" />
        <Column title="Listo" estado="listo" orders={grouped.listo} next={null} />
        <Column title="Entregado" estado="entregado" orders={grouped.entregado} next={null} />
      </div>

      <div className="mt-6 text-xs text-zinc-600">
        Tabla: orders (estado) → trigger sync_mesa_estado → mesas.estado • Historial en order_status_history • Vista v_pedidos_activos
      </div>
    </div>
  );
}
