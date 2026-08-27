import { prisma } from '@/lib/prisma';

const RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

export default async function LunaPage() {
  const stats = await prisma.$queryRaw<any[]>`SELECT * FROM v_dashboard WHERE restaurant_id = ${RESTAURANT_ID}::uuid`;
  const d = stats[0];
  const pedidosPendientes = Number(d?.nuevos ?? 0) + Number(d?.en_preparacion ?? 0);
  const topProducts = await prisma.$queryRaw<any[]>`
    SELECT p.nombre, COUNT(oi.id) as ventas, SUM(oi.cantidad) as unidades
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.restaurant_id = ${RESTAURANT_ID}::uuid
    GROUP BY p.nombre ORDER BY ventas DESC LIMIT 3
  `;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Luna-Worker <span className="text-sm font-normal text-zinc-400">— IA de gestión</span></h1>
      <p className="text-zinc-500 text-sm mb-6">Fork de luna-2.0 adaptado a trabajador • psique-trabajador.js + tools-restaurante.js • Gemini 2.5 Flash-Lite</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h2 className="font-semibold mb-3">Estado actual (tools)</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between bg-zinc-950 p-2 rounded"><span>Pedidos pendientes</span><span className="font-bold">{pedidosPendientes}</span></div>
            <div className="flex justify-between bg-zinc-950 p-2 rounded"><span>Mesas ocupadas</span><span>{Number(d?.mesas_ocupadas ?? 0)}</span></div>
            <div className="flex justify-between bg-zinc-950 p-2 rounded"><span>Ventas hoy</span><span>${Number(d?.ventas_hoy ?? 0).toLocaleString()}</span></div>
          </div>
          <div className="text-xs text-zinc-600 mt-3">Tools disponibles: get_pedidos, get_ventas, get_top_productos, update_precio, update_disponibilidad, create_producto, generate_descripcion, create_categoria</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h2 className="font-semibold mb-3">Top productos (análisis)</h2>
          {(topProducts as any[]).length === 0 ? <p className="text-sm text-zinc-500">Sin ventas aún</p> :
            <div className="space-y-2">
              {(topProducts as any[]).map((p: any) => (
                <div key={p.nombre} className="flex justify-between bg-zinc-950 p-2 rounded text-sm">
                  <span>{p.nombre}</span><span className="text-zinc-400">{Number(p.unidades)} uds</span>
                </div>
              ))}
            </div>
          }
          <div className="text-xs text-zinc-600 mt-3">En prod: Luna ejecutará este análisis y propondrá combos/promos vía agente.</div>
        </div>
      </div>

      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Chat con Luna (placeholder)</h3>
        <div className="bg-zinc-950 border border-zinc-800 rounded p-3 text-sm space-y-2">
          <div className="text-zinc-400">Ejemplos que podrá hacer:</div>
          <div className="bg-zinc-800 p-2 rounded">Tú: <span className="text-white">¿Cuántos pedidos pendientes?</span></div>
          <div className="bg-green-500/10 p-2 rounded">Luna: <span className="text-green-300">Hay {pedidosPendientes} pendientes: {Number(d?.nuevos ?? 0)} nuevos y {Number(d?.en_preparacion ?? 0)} en preparación.</span> <span className="text-xs text-zinc-500">[tool:get_pedidos]</span></div>
          <div className="bg-zinc-800 p-2 rounded">Tú: <span className="text-white">Cambia la hamburguesa clásica a $27.000</span></div>
          <div className="bg-green-500/10 p-2 rounded">Luna: <span className="text-green-300">Listo, precio actualizado. ¿Confirmo?</span> <span className="text-xs text-zinc-500">[tool:update_precio]</span></div>
        </div>
        <div className="text-xs text-zinc-600 mt-3">Integración: copiar luna-2.0 → /onlyfood/src/lib/luna/ con psique-trabajador.js, tools-restaurante.js, modelo.js (Gemini). Endpoint: POST /api/luna/chat</div>
        <div className="flex gap-2 mt-4">
          <button disabled className="bg-zinc-800 text-zinc-500 px-4 py-2 rounded text-sm cursor-not-allowed">Conectar Gemini (próximo sprint día 20-26)</button>
          <span className="text-xs text-zinc-600 py-2">Listo para sprint 4 — solo falta wirear modelo.js</span>
        </div>
      </div>

      <div className="mt-4 text-xs text-zinc-600">
        Memoria por restaurante: memoria/{RESTAURANT_ID}.json • Causalidad obligatoria (cita episodio) → auditoría • RLS por restaurant_id
      </div>
    </div>
  );
}
