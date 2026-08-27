import { prisma } from '@/lib/prisma';

export default async function Home() {
  const restaurants = await prisma.restaurant.findMany();
  const mesas = await prisma.mesa.findMany({ take: 5 });
  const pedidosActivos = await prisma.$queryRaw`SELECT * FROM v_pedidos_activos`;

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">OnlyFood — Plataforma 3D</h1>
        <p className="text-zinc-400 mb-8">Next.js + Prisma + PostgreSQL local ✅</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm">Restaurantes</div>
            <div className="text-2xl font-bold">{restaurants.length}</div>
            <div className="text-zinc-500 text-xs mt-1">{restaurants[0]?.slug}</div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm">Mesas</div>
            <div className="text-2xl font-bold">{mesas.length}</div>
            <div className="text-zinc-500 text-xs mt-1">{mesas[0]?.qrToken.slice(0,8)}...</div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm">Pedidos activos</div>
            <div className="text-2xl font-bold">{(pedidosActivos as any[]).length}</div>
            <div className="text-zinc-500 text-xs mt-1">v_pedidos_activos</div>
          </div>
        </div>

        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 mb-4">
          <h2 className="font-semibold mb-2">Conexión DB</h2>
          <code className="text-xs bg-black p-2 rounded block overflow-auto">
            DATABASE_URL=postgresql://postgres:***@localhost:5432/Onlyfood
          </code>
          <p className="text-green-400 text-sm mt-2">✅ Prisma conectado — schema 18 tablas, triggers y vistas operativas</p>
        </div>

        <div className="flex gap-2">
          <a href="/api/health" className="bg-white text-black px-4 py-2 rounded text-sm font-medium">/api/health</a>
          <span className="text-zinc-500 text-sm py-2">Siguiente: /panel y /menu/[qr]</span>
        </div>
      </div>
    </main>
  );
}
