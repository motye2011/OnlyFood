import { prisma } from '@/lib/prisma';

const RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

export default async function Dashboard() {
  const [dashboard] = await prisma.$queryRaw<any[]>`SELECT * FROM v_dashboard WHERE restaurant_id = ${RESTAURANT_ID}::uuid`;
  const pedidosActivos = await prisma.$queryRaw<any[]>`SELECT * FROM v_pedidos_activos WHERE restaurant_id = ${RESTAURANT_ID}::uuid`;
  const mesas = await prisma.mesa.findMany({ where: { restaurantId: RESTAURANT_ID }, orderBy: { numero: 'asc' } });
  const productos = await prisma.product.count({ where: { restaurantId: RESTAURANT_ID } });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-zinc-500 text-sm mb-6">Demo OnlyFood — tiempo real</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-zinc-400 text-xs">Nuevos</div>
          <div className="text-3xl font-bold text-yellow-400">{Number(dashboard?.nuevos ?? 0)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-zinc-400 text-xs">En preparación</div>
          <div className="text-3xl font-bold text-orange-400">{Number(dashboard?.en_preparacion ?? 0)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-zinc-400 text-xs">Listos</div>
          <div className="text-3xl font-bold text-green-400">{Number(dashboard?.listos ?? 0)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-zinc-400 text-xs">Mesas ocupadas</div>
          <div className="text-3xl font-bold">{Number(dashboard?.mesas_ocupadas ?? 0)}/{mesas.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-zinc-400 text-xs">Ventas hoy</div>
          <div className="text-xl font-bold">${Number(dashboard?.ventas_hoy ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h2 className="font-semibold mb-3">Cola activa</h2>
          {(pedidosActivos as any[]).length === 0 ? (
            <p className="text-zinc-500 text-sm">Sin pedidos activos</p>
          ) : (
            <div className="space-y-2">
              {(pedidosActivos as any[]).map((p: any) => (
                <div key={p.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded border border-zinc-800">
                  <div>
                    <div className="font-medium text-sm">Pedido #{p.numero} — Mesa {p.mesa_numero}</div>
                    <div className="text-xs text-zinc-400">{p.items_count} items • ${Number(p.total).toLocaleString()}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${p.estado==='nuevo'?'bg-yellow-500 text-black':p.estado==='en_preparacion'?'bg-orange-500 text-white':'bg-green-500 text-black'}`}>{p.estado}</span>
                </div>
              ))}
            </div>
          )}
          <a href="/panel/pedidos" className="text-xs text-zinc-400 hover:text-white mt-3 inline-block">Ver todos →</a>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h2 className="font-semibold mb-3">Mesas</h2>
          <div className="grid grid-cols-4 gap-2">
            {mesas.map((m) => (
              <div key={m.id} className={`p-3 rounded text-center text-sm border ${m.estado==='ocupada'?'bg-red-500/20 border-red-500/50 text-red-300':m.estado==='reservada'?'bg-yellow-500/20 border-yellow-500/50':'bg-zinc-800 border-zinc-700'}`}>
                <div className="font-bold">M{m.numero}</div>
                <div className="text-xs">{m.estado}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-zinc-500 mt-3">{productos} productos • {mesas.length} mesas</div>
        </div>
      </div>

      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Luna-Worker</h3>
        <p className="text-xs text-zinc-400">Placeholder listo. Endpoint: <code className="bg-black px-1 py-0.5 rounded">/panel/luna</code> — se conectará a Gemini 2.5 Flash-Lite con tools de restaurante.</p>
        <div className="text-xs text-zinc-600 mt-2">Tablas: profiles (admin/trabajador) • orders (nuevo→entregado) • product_models (3D)</div>
      </div>
    </div>
  );
}
