import { prisma } from '@/lib/prisma';

const RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

export default async function Dashboard() {
  const [dashboard] = await prisma.$queryRaw<any[]>`SELECT * FROM v_dashboard WHERE restaurant_id = ${RESTAURANT_ID}::uuid`;
  const pedidosActivos = await prisma.$queryRaw<any[]>`SELECT * FROM v_pedidos_activos WHERE restaurant_id = ${RESTAURANT_ID}::uuid`;
  const mesas = await prisma.mesa.findMany({ where: { restaurantId: RESTAURANT_ID }, orderBy: { numero: 'asc' } });
  const productos = await prisma.product.count({ where: { restaurantId: RESTAURANT_ID } });

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <h1 className="text-2xl font-light tracking-wide text-[#1a1a1a] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Dashboard</h1>
      <p className="text-[#9a8a86] text-sm mb-6">Demo OnlyFood — tiempo real</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-[#e8d5d0] p-4 rounded-lg">
          <div className="text-[#9a8a86] text-xs tracking-wide">Nuevos</div>
          <div className="text-3xl font-light text-[#c9a098]">{Number(dashboard?.nuevos ?? 0)}</div>
        </div>
        <div className="bg-white border border-[#e8d5d0] p-4 rounded-lg">
          <div className="text-[#9a8a86] text-xs tracking-wide">En preparación</div>
          <div className="text-3xl font-light text-[#d4a373]">{Number(dashboard?.en_preparacion ?? 0)}</div>
        </div>
        <div className="bg-white border border-[#e8d5d0] p-4 rounded-lg">
          <div className="text-[#9a8a86] text-xs tracking-wide">Listos</div>
          <div className="text-3xl font-light text-[#7a9e7e]">{Number(dashboard?.listos ?? 0)}</div>
        </div>
        <div className="bg-white border border-[#e8d5d0] p-4 rounded-lg">
          <div className="text-[#9a8a86] text-xs tracking-wide">Mesas ocupadas</div>
          <div className="text-3xl font-light text-[#1a1a1a]">{Number(dashboard?.mesas_ocupadas ?? 0)}/{mesas.length}</div>
        </div>
        <div className="bg-white border border-[#e8d5d0] p-4 rounded-lg">
          <div className="text-[#9a8a86] text-xs tracking-wide">Ventas hoy</div>
          <div className="text-xl font-light text-[#1a1a1a]">${Number(dashboard?.ventas_hoy ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e8d5d0] rounded-lg p-4">
          <h2 className="font-light mb-3 text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>Cola activa</h2>
          {(pedidosActivos as any[]).length === 0 ? (
            <p className="text-[#9a8a86] text-sm">Sin pedidos activos</p>
          ) : (
            <div className="space-y-2">
              {(pedidosActivos as any[]).map((p: any) => (
                <div key={p.id} className="flex justify-between items-center bg-[#fdfbf7] p-3 rounded border border-[#e8d5d0]">
                  <div>
                    <div className="font-medium text-sm text-[#1a1a1a]">Pedido #{p.numero} — Mesa {p.mesa_numero}</div>
                    <div className="text-xs text-[#9a8a86]">{p.items_count} items • ${Number(p.total).toLocaleString()}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${p.estado==='nuevo'?'bg-[#fef3c7] text-[#92400e]':p.estado==='en_preparacion'?'bg-[#ffedd5] text-[#9a3412]':'bg-[#dcfce7] text-[#166534]'}`}>{p.estado}</span>
                </div>
              ))}
            </div>
          )}
          <a href="/panel/pedidos" className="text-xs text-[#c9a098] hover:text-[#1a1a1a] mt-3 inline-block">Ver todos →</a>
        </div>

        <div className="bg-white border border-[#e8d5d0] rounded-lg p-4">
          <h2 className="font-light mb-3 text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>Mesas</h2>
          <div className="grid grid-cols-4 gap-2">
            {mesas.map((m) => (
              <div key={m.id} className={`p-3 rounded text-center text-sm border ${m.estado==='ocupada'?'bg-[#fee2e2] border-[#fca5a5] text-[#991b1b]':m.estado==='reservada'?'bg-[#fef3c7] border-[#fcd34d]':'bg-[#fdfbf7] border-[#e8d5d0] text-[#1a1a1a]'}`}>
                <div className="font-medium">M{m.numero}</div>
                <div className="text-xs opacity-70">{m.estado}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-[#9a8a86] mt-3">{productos} productos • {mesas.length} mesas</div>
        </div>
      </div>

      <div className="mt-6 bg-white border border-[#e8d5d0] rounded-lg p-4">
        <h3 className="text-sm font-light mb-2 text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>Luna-Worker</h3>
        <p className="text-xs text-[#9a8a86]">Placeholder listo. Endpoint: <code className="bg-[#fdfbf7] border border-[#e8d5d0] px-1 py-0.5 rounded">/panel/luna</code> — se conectará a Gemini 2.0 Flash con tools de restaurante.</p>
      </div>
    </div>
  );
}
