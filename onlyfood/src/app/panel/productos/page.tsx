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
    <div>
      <h1 className="text-2xl font-bold mb-1">Productos</h1>
      <p className="text-zinc-500 text-sm mb-6">{products.length} productos • {categories.length} categorías</p>

      <form action={createProduct} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg mb-6 grid md:grid-cols-5 gap-3">
        <input name="nombre" placeholder="Nombre" required className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm" />
        <input name="precio" placeholder="Precio" type="number" required className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm" />
        <input name="categoria" placeholder="Categoría" list="cats" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm" />
        <datalist id="cats">{categories.map((c) => <option key={c.id} value={c.nombre} />)}</datalist>
        <input name="descripcion" placeholder="Descripción" className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm" />
        <button type="submit" className="bg-white text-black rounded px-4 py-2 text-sm font-medium">Agregar</button>
      </form>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="text-left p-3">Producto</th>
              <th className="text-left p-3">Categoría</th>
              <th className="text-left p-3">Precio</th>
              <th className="text-left p-3">Estado</th>
              <th className="p-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                <td className="p-3">
                  <div className="font-medium">{p.nombre}</div>
                  <div className="text-xs text-zinc-500">{p.descripcion?.slice(0,50)}</div>
                </td>
                <td className="p-3 text-zinc-400">{p.category?.nombre ?? '-'}</td>
                <td className="p-3">${Number(p.precio).toLocaleString()}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded ${p.disponible ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {p.disponible ? 'Disponible' : 'Agotado'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <form action={toggleDisponible.bind(null, p.id, p.disponible)}>
                    <button className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded">Toggle</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <div className="p-8 text-center text-zinc-500 text-sm">Sin productos</div>}
      </div>
      <p className="text-xs text-zinc-600 mt-3">Fotos, extras y modelo 3D se agregan en detalle (MVP2). Tabla: products + product_images + product_models</p>
    </div>
  );
}
