import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import MenuClient from './MenuClient';

export default async function MenuPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const mesa = await prisma.mesa.findUnique({
    where: { qrToken: token },
    include: { restaurant: true },
  });
  if (!mesa) notFound();

  // Registrar escaneo
  await prisma.qrScan.create({
    data: { restaurantId: mesa.restaurantId, mesaId: mesa.id },
  }).catch(() => {});

  const categories = await prisma.category.findMany({
    where: { restaurantId: mesa.restaurantId, activo: true },
    orderBy: { orden: 'asc' },
  });
  const products = await prisma.product.findMany({
    where: { restaurantId: mesa.restaurantId, disponible: true },
    include: { category: true },
    orderBy: { nombre: 'asc' },
  });

  // Crear sesión para este acceso (opcional, 4h)
  const session = await prisma.mesaSession.create({
    data: { mesaId: mesa.id, restaurantId: mesa.restaurantId },
  });

  return (
    <MenuClient
      mesa={{ id: mesa.id, numero: mesa.numero, nombre: mesa.nombre, token: mesa.qrToken }}
      restaurant={{ id: mesa.restaurant.id, nombre: mesa.restaurant.nombre, slug: mesa.restaurant.slug }}
      categories={categories}
      products={products.map((p) => ({ id: p.id, nombre: p.nombre, descripcion: p.descripcion, precio: Number(p.precio), categoria: p.category?.nombre ?? 'Sin categoría', imagenUrl: p.imagenUrl }))}
      sessionToken={session.token}
    />
  );
}
