export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#1a1a1a] flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      <aside className="w-64 bg-white border-r border-[#e8d5d0] p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-light tracking-[0.2em] text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>ONLYFOOD</h1>
          <p className="text-xs tracking-[0.15em] text-[#9a8a86]">PANEL RESTAURANTE</p>
          <div className="h-[1px] w-12 bg-[#c9a098] mt-2" />
          <p className="text-xs text-[#c9a098] mt-2">demo-onlyfood</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <a href="/panel" className="px-3 py-2 rounded bg-[#1a1a1a] text-[#fdfbf7] text-sm font-medium">Dashboard</a>
          <a href="/panel/pedidos" className="px-3 py-2 rounded hover:bg-[#fdfbf7] border border-transparent hover:border-[#e8d5d0] text-sm text-[#5a4a47]">Pedidos</a>
          <a href="/panel/productos" className="px-3 py-2 rounded hover:bg-[#fdfbf7] border border-transparent hover:border-[#e8d5d0] text-sm text-[#5a4a47]">Productos</a>
          <a href="/panel/mesas" className="px-3 py-2 rounded hover:bg-[#fdfbf7] border border-transparent hover:border-[#e8d5d0] text-sm text-[#5a4a47]">Mesas / QR</a>
          <a href="/panel/luna" className="px-3 py-2 rounded hover:bg-[#fdfbf7] border border-transparent hover:border-[#e8d5d0] text-sm text-[#5a4a47]">Luna-Worker <span className="text-xs bg-[#e8d5d0] px-1.5 py-0.5 rounded ml-1">IA</span></a>
        </nav>
        <div className="text-xs text-[#9a8a86] mt-4 border-t border-[#e8d5d0] pt-4">
          <div>Admin: admin@onlyfood.test</div>
          <a href="/" className="text-[#c9a098] hover:text-[#1a1a1a]">← Inicio</a>
        </div>
      </aside>
      <main className="flex-1 bg-[#fdfbf7] p-6 overflow-auto">{children}</main>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400&family=Inter:wght@300;400&display=swap');`}</style>
    </div>
  );
}
