import { prisma } from '@/lib/prisma';
import LunaChat from './LunaChat';

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
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <h1 className="text-2xl font-light tracking-wide text-[#1a1a1a] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Luna-Worker <span className="text-sm font-light text-[#9a8a86]">— IA de gestión</span></h1>
      <p className="text-[#9a8a86] text-sm mb-6">Fork de luna-2.0 adaptado a trabajador • psique-trabajador.js + tools-restaurante.js • Gemini 1.5 Flash</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e8d5d0] rounded-lg p-4">
          <h2 className="font-light mb-3 text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>Estado actual</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between bg-[#fdfbf7] border border-[#e8d5d0] p-2 rounded"><span className="text-[#5a4a47]">Pedidos pendientes</span><span className="font-medium text-[#1a1a1a]">{pedidosPendientes}</span></div>
            <div className="flex justify-between bg-[#fdfbf7] border border-[#e8d5d0] p-2 rounded"><span className="text-[#5a4a47]">Mesas ocupadas</span><span className="text-[#1a1a1a]">{Number(d?.mesas_ocupadas ?? 0)}</span></div>
            <div className="flex justify-between bg-[#fdfbf7] border border-[#e8d5d0] p-2 rounded"><span className="text-[#5a4a47]">Ventas hoy</span><span className="text-[#1a1a1a]">${Number(d?.ventas_hoy ?? 0).toLocaleString()}</span></div>
          </div>
          <div className="text-xs text-[#9a8a86] mt-3">Tools: get_pedidos, get_ventas, get_top_productos, update_precio, create_producto</div>
        </div>

        <div className="bg-white border border-[#e8d5d0] rounded-lg p-4">
          <h2 className="font-light mb-3 text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>Top productos</h2>
          {(topProducts as any[]).length === 0 ? <p className="text-sm text-[#9a8a86]">Sin ventas aún</p> :
            <div className="space-y-2">
              {(topProducts as any[]).map((p: any) => (
                <div key={p.nombre} className="flex justify-between bg-[#fdfbf7] border border-[#e8d5d0] p-2 rounded text-sm">
                  <span className="text-[#1a1a1a]">{p.nombre}</span><span className="text-[#9a8a86]">{Number(p.unidades)} uds</span>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      <div className="mt-6">
        <LunaChat />
      </div>

      <div className="mt-4 text-xs text-[#9a8a86]">
        Memoria por restaurante: memoria/{RESTAURANT_ID}.json • Causalidad obligatoria → auditoría
      </div>
    </div>
  );
}
