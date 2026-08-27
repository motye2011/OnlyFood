// @ts-nocheck
import { prisma } from '@/lib/prisma';

const RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

// Definiciones para Gemini function calling
export const toolDeclarations = [
  {
    name: 'get_pedidos',
    description: 'Consulta pedidos por estado y rango. Úsalo para "cuántos pendientes" o "manda a cocina"',
    parameters: {
      type: 'object',
      properties: {
        estado: { type: 'string', enum: ['nuevo', 'en_preparacion', 'listo', 'entregado', 'todos'], description: 'Estado a filtrar' },
        limit: { type: 'number', description: 'Límite resultados' },
      },
    },
  },
  {
    name: 'get_top_productos',
    description: 'Plato más pedido en los últimos N días. Úsalo para "¿cuál fue el plato más pedido en los últimos 20 días?"',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Días hacia atrás, ej 20' },
        limit: { type: 'number', description: 'Cuántos top' },
      },
      required: ['days'],
    },
  },
  {
    name: 'get_ventas',
    description: 'Ventas totales y conteo pedidos en rango',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Días' },
      },
      required: ['days'],
    },
  },
  {
    name: 'update_pedidos_bulk',
    description: 'Mueve todos los pedidos de un estado a otro. Para "manda todos los pendientes a cocina" (nuevo->en_preparacion)',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string', enum: ['nuevo', 'en_preparacion', 'listo'] },
        to: { type: 'string', enum: ['en_preparacion', 'listo', 'entregado'] },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'update_precio',
    description: 'Cambia precio de un producto por nombre',
    parameters: {
      type: 'object',
      properties: {
        producto: { type: 'string', description: 'Nombre del producto, ej "Hamburguesa Clásica"' },
        precio: { type: 'number', description: 'Nuevo precio' },
      },
      required: ['producto', 'precio'],
    },
  },
  {
    name: 'update_disponibilidad',
    description: 'Activa/desactiva producto',
    parameters: {
      type: 'object',
      properties: {
        producto: { type: 'string' },
        disponible: { type: 'boolean' },
      },
      required: ['producto', 'disponible'],
    },
  },
  {
    name: 'get_mesas_estado',
    description: 'Estado de mesas (libre/ocupada)',
    parameters: { type: 'object', properties: {} },
  },
];

// Implementaciones
export async function get_pedidos({ estado = 'todos', limit = 20 } = {}) {
  const where = { restaurantId: RESTAURANT_ID } as any;
  if (estado !== 'todos') where.estado = estado;
  const orders = await prisma.order.findMany({ where, take: limit, orderBy: { createdAt: 'desc' }, include: { mesa: true } });
  return orders.map((o) => ({ numero: o.numero, mesa: o.mesa.numero, estado: o.estado, total: Number(o.total), fecha: o.createdAt }));
}

export async function get_top_productos({ days, limit = 3 }) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows: any[] = await prisma.$queryRaw`
    SELECT p.nombre, COUNT(oi.id)::int as ventas, SUM(oi.cantidad)::int as unidades, SUM(oi.subtotal)::float as ingresos
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.restaurant_id = ${RESTAURANT_ID}::uuid AND o.created_at >= ${since}
    GROUP BY p.nombre ORDER BY ventas DESC LIMIT ${limit}
  `;
  return rows;
}

export async function get_ventas({ days }) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int as pedidos, COALESCE(SUM(total),0)::float as ventas
    FROM orders WHERE restaurant_id = ${RESTAURANT_ID}::uuid AND created_at >= ${since} AND estado != 'cancelado'
  `;
  return rows[0];
}

export async function update_pedidos_bulk({ from, to }) {
  const res = await prisma.order.updateMany({ where: { restaurantId: RESTAURANT_ID, estado: from as any }, data: { estado: to as any } });
  return { actualizados: res.count, de: from, a: to };
}

export async function update_precio({ producto, precio }) {
  const p = await prisma.product.findFirst({ where: { restaurantId: RESTAURANT_ID, nombre: { contains: producto, mode: 'insensitive' } } });
  if (!p) return { error: `No encontré producto "${producto}"` };
  await prisma.product.update({ where: { id: p.id }, data: { precio } });
  return { ok: true, producto: p.nombre, nuevoPrecio: precio };
}

export async function update_disponibilidad({ producto, disponible }) {
  const p = await prisma.product.findFirst({ where: { restaurantId: RESTAURANT_ID, nombre: { contains: producto, mode: 'insensitive' } } });
  if (!p) return { error: `No encontré producto "${producto}"` };
  await prisma.product.update({ where: { id: p.id }, data: { disponible } });
  return { ok: true, producto: p.nombre, disponible };
}

export async function get_mesas_estado() {
  const mesas = await prisma.mesa.findMany({ where: { restaurantId: RESTAURANT_ID }, select: { numero: true, estado: true, nombre: true } });
  return mesas;
}

export const toolMap = {
  get_pedidos,
  get_top_productos,
  get_ventas,
  update_pedidos_bulk,
  update_precio,
  update_disponibilidad,
  get_mesas_estado,
};
