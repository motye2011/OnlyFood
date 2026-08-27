import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

async function createProduct(formData: FormData) {
  'use server';
  const nombre = formData.get('nombre') as string;
  const precio = parseFloat(formData.get('precio') as string);
  const categoria = formData.get('categoria') as string;
  if (!nombre || !precio) return;
  let categoryId = null;
  if (categoria) {
    const cat = await prisma.category.findFirst({ where: { restaurantId: RESTAURANT_ID, nombre: categoria } });
    if (cat) categoryId = cat.id;
    else {
      const newCat = await prisma.category.create({ data: { restaurantId: RESTAURANT_ID, nombre: categoria } });
      categoryId = newCat.id;
    }
  }
  await prisma.product.create({
    data: {
      restaurantId: RESTAURANT_ID,
      categoryId,
      nombre,
      precio,
      descripcion: (formData.get('descripcion') as string) || '',
      disponible: true,
    },
  });
  revalidatePath('/panel/productos');
}

async function toggleDisponible(id: string, disponible: boolean) {
  'use server';
  await prisma.product.update({ where: { id }, data: { disponible: !disponible } });
  revalidatePath('/panel/productos');
}

export default async function ProductosPage() {
  const products = await prisma.product.findMany({
    where: { restaurantId: RESTAURANT_ID },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
  const categories = await prisma.category.findMany({ where: { restaurantId: RESTAURANT_ID } });

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <h1 className="text-2xl font-light tracking-wide text-[#1a1a1a] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Productos</h1>
      <p className="text-[#9a8a86] text-sm mb-6">{products.length} productos • {categories.length} categorías</p>

      <form action={createProduct} className="bg-white border border-[#e8d5d0] p-4 rounded-lg mb-6 grid md:grid-cols-5 gap-3">
        <input name="nombre" placeholder="Nombre" required className="bg-[#fdfbf7] border border-[#e8d5d0] rounded px-3 py-2 text-sm text-[#1a1a1a]" />
        <input name="precio" placeholder="Precio" type="number" required className="bg-[#fdfbf7] border border-[#e8d5d0] rounded px-3 py-2 text-sm" />
        <input name="categoria" placeholder="Categoría" list="cats" className="bg-[#fdfbf7] border border-[#e8d5d0] rounded px-3 py-2 text-sm" />
        <datalist id="cats">{categories.map((c) => <option key={c.id} value={c.nombre} />)}</datalist>
        <input name="descripcion" placeholder="Descripción" className="bg-[#fdfbf7] border border-[#e8d5d0] rounded px-3 py-2 text-sm" />
        <button type="submit" className="bg-[#1a1a1a] text-[#fdfbf7] rounded px-4 py-2 text-sm font-medium">Agregar</button>
      </form>

      <div className="bg-white border border-[#e8d5d0] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#fdfbf7] text-[#9a8a86]">
            <tr>
              <th className="text-left p-3 font-light">Producto</th>
              <th className="text-left p-3 font-light">Categoría</th>
              <th className="text-left p-3 font-light">Precio</th>
              <th className="text-left p-3 font-light">Estado</th>
              <th className="p-3 font-light">Acción</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-[#e8d5d0] hover:bg-[#fdfbf7]">
                <td className="p-3">
                  <div className="font-medium text-[#1a1a1a]">{p.nombre}</div>
                  <div className="text-xs text-[#9a8a86]">{p.descripcion?.slice(0,50)}</div>
                  {p.ingredientes && <div className="text-[11px] text-[#c9a098] mt-1">Ing: {p.ingredientes.slice(0,60)}</div>}
                </td>
                <td className="p-3 text-[#9a8a86]">{p.category?.nombre ?? '-'}</td>
                <td className="p-3 text-[#1a1a1a]">${Number(p.precio).toLocaleString()}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded ${p.disponible ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'}`}>
                    {p.disponible ? 'Disponible' : 'Agotado'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <form action={toggleDisponible.bind(null, p.id, p.disponible)}>
                    <button className="text-xs bg-[#fdfbf7] border border-[#e8d5d0] hover:bg-white px-2 py-1 rounded text-[#5a4a47]">Toggle</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <div className="p-8 text-center text-[#9a8a86] text-sm">Sin productos</div>}
      </div>
    </div>
  );
}
