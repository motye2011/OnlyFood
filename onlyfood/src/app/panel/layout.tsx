export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold">OnlyFood</h1>
          <p className="text-xs text-zinc-500">Panel Restaurante</p>
          <p className="text-xs text-zinc-600 mt-1">demo-onlyfood</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <a href="/panel" className="px-3 py-2 rounded bg-white text-black text-sm font-medium">Dashboard</a>
          <a href="/panel/pedidos" className="px-3 py-2 rounded hover:bg-zinc-800 text-sm">Pedidos</a>
          <a href="/panel/productos" className="px-3 py-2 rounded hover:bg-zinc-800 text-sm">Productos</a>
          <a href="/panel/mesas" className="px-3 py-2 rounded hover:bg-zinc-800 text-sm">Mesas / QR</a>
          <a href="/panel/luna" className="px-3 py-2 rounded hover:bg-zinc-800 text-sm">Luna-Worker <span className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded ml-1">IA</span></a>
        </nav>
        <div className="text-xs text-zinc-600 mt-4">
          <div>Admin: admin@onlyfood.test</div>
          <a href="/" className="text-zinc-400 hover:text-white">← Inicio</a>
        </div>
      </aside>
      <main className="flex-1 bg-zinc-950 p-6 overflow-auto">{children}</main>
    </div>
  );
}
