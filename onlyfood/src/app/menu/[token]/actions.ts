'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function placeOrder(data: {
  mesaId: string;
  restaurantId: string;
  sessionToken: string;
  items: { productId: string; cantidad: number }[];
}) {
  try {
    const session = await prisma.mesaSession.findUnique({ where: { token: data.sessionToken } });
    if (!session) return { success: false, error: 'Sesión no encontrada' };

    // Crear pedido
    const order = await prisma.order.create({
      data: {
        restaurantId: data.restaurantId,
        mesaId: data.mesaId,
        sessionId: session.id,
        numero: 0, // trigger lo asigna
        estado: 'nuevo',
        total: 0,
      },
    });

    // Crear items (snapshot nombre y precio)
    for (const it of data.items) {
      const product = await prisma.product.findUnique({ where: { id: it.productId } });
      if (!product) continue;
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          productNombre: product.nombre,
          cantidad: it.cantidad,
          precioUnitario: product.precio,
          subtotal: Number(product.precio) * it.cantidad,
        },
      });
    }

    // Recalcular total (trigger ya lo hace, pero reforzamos)
    const updated = await prisma.order.findUnique({ where: { id: order.id }, include: { items: true } });
    const total = updated?.items.reduce((s, i) => s + Number(i.subtotal), 0) ?? 0;
    await prisma.order.update({ where: { id: order.id }, data: { total, subtotal: total } });

    revalidatePath('/panel/pedidos');
    revalidatePath('/panel');

    return { success: true, numero: updated?.numero ?? order.numero, total };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}
