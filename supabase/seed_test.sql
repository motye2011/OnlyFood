-- OnlyFood - Seed de prueba + validación
-- Ejecutar en: onlyfood -> Query Tool -> Open seed_test.sql -> Execute
-- Valida: profiles, mesas QR, pedidos con estados, triggers, vistas

-- Limpieza previa (si re-ejecutas)
delete from model_views where true;
delete from product_views where true;
delete from qr_scans where true;
delete from order_status_history where true;
delete from order_item_extras where true;
delete from order_items where true;
delete from orders where true;
delete from mesa_sessions where true;
delete from mesas where true;
delete from product_models where true;
delete from product_extras where true;
delete from product_images where true;
delete from extras where true;
delete from products where true;
delete from categories where true;
delete from profiles where true;
delete from auth.users where email in ('admin@onlyfood.test','cocina@onlyfood.test');
delete from restaurants where slug = 'demo-onlyfood';
delete from restaurant_counters where restaurant_id in (select id from restaurants where slug='demo-onlyfood');

-- 1. Restaurante demo
insert into restaurants (id, nombre, slug, descripcion, telefono, direccion)
values ('00000000-0000-0000-0000-000000000001', 'Demo OnlyFood', 'demo-onlyfood', 'Restaurante de prueba hackaton', '3001234567', 'Calle 123 #45-67')
on conflict (id) do nothing;

-- 2. Usuarios mock (local) - sin Supabase Auth
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000101', 'admin@onlyfood.test') on conflict (id) do nothing;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000102', 'cocina@onlyfood.test') on conflict (id) do nothing;

-- Perfiles: admin y trabajador cocina
insert into profiles (id, restaurant_id, email, nombre, rol, trabajador_tipo) values
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'admin@onlyfood.test', 'Admin Demo', 'admin', 'admin'),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'cocina@onlyfood.test', 'Cocina Demo', 'trabajador', 'cocina')
on conflict (id) do nothing;

-- 3. Categorías
insert into categories (restaurant_id, nombre, orden) values
('00000000-0000-0000-0000-000000000001', 'Hamburguesas', 1),
('00000000-0000-0000-0000-000000000001', 'Bebidas', 2)
on conflict do nothing;

-- 4. Productos (usamos ids fijos para test)
insert into products (id, restaurant_id, category_id, nombre, descripcion, precio, ingredientes, disponible) values
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', (select id from categories where nombre='Hamburguesas' limit 1), 'Hamburguesa Clásica', 'Carne 150g, queso, lechuga', 25000, 'Carne, Queso, Lechuga, Pan', true),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', (select id from categories where nombre='Bebidas' limit 1), 'Limonada Natural', 'Limonada 500ml', 8000, 'Limón, Agua, Azúcar', true)
on conflict (id) do nothing;

-- Extra
insert into extras (id, restaurant_id, nombre, precio) values ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'Queso extra', 3000) on conflict (id) do nothing;
insert into product_extras (product_id, extra_id) values ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000301') on conflict do nothing;

-- 5. Mesas con QR
insert into mesas (id, restaurant_id, numero, nombre, capacidad, estado) values
('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', 1, 'Mesa 01 - Terraza', 4, 'libre'),
('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000001', 2, 'Mesa 02', 2, 'libre')
on conflict (id) do nothing;

-- Ver QR tokens generados
select 'QR Mesa 1' as test, numero, qr_token, estado from mesas where restaurant_id='00000000-0000-0000-0000-000000000001';

-- 6. Simular escaneo QR -> crea sesión
insert into mesa_sessions (id, mesa_id, restaurant_id, token) values ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', 'test-session-token-123') on conflict (id) do nothing;

-- 7. Pedido 1: Mesa 1, 2 hamburguesas + 1 limonada (debe quedar total = 58000)
insert into orders (id, restaurant_id, mesa_id, session_id, estado, notas, cliente_nombre) values
('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000501', 'nuevo', 'Sin cebolla', 'Cliente Demo')
on conflict (id) do nothing;

insert into order_items (order_id, product_id, product_nombre, cantidad, precio_unitario, subtotal) values
('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000201', 'Hamburguesa Clásica', 2, 25000, 50000),
('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000202', 'Limonada Natural', 1, 8000, 8000)
on conflict do nothing;

-- Añadir extra a primer item
insert into order_item_extras (order_item_id, extra_id, extra_nombre, precio)
select oi.id, '00000000-0000-0000-0000-000000000301', 'Queso extra', 3000 from order_items oi where oi.order_id='00000000-0000-0000-0000-000000000601' limit 1
on conflict do nothing;

-- 8. Pedido 2: Mesa 2, 1 hamburguesa (para cola)
insert into orders (id, restaurant_id, mesa_id, estado) values ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000402', 'nuevo') on conflict (id) do nothing;
insert into order_items (order_id, product_id, product_nombre, cantidad, precio_unitario, subtotal) values ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000201', 'Hamburguesa Clásica', 1, 25000, 25000) on conflict do nothing;

-- ============================================================
-- VALIDACIONES (deben retornar datos)
-- ============================================================

-- A. Ver totales recalculados por trigger
select 'Test Total Pedido 1' as test, numero, estado, total, subtotal from orders where id='00000000-0000-0000-0000-000000000601';
-- Esperado: total 61000 (50000+8000+3000) o 58000 si extra no suma? Nuestro trigger suma extras también -> 61000

-- B. Ver estado mesa cambió a ocupada automáticamente
select 'Test Mesa Estado' as test, numero, estado from mesas where id in ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000402');

-- C. Simular cambio de estado: nuevo -> en_preparacion -> listo
update orders set estado='en_preparacion', created_by='00000000-0000-0000-0000-000000000102' where id='00000000-0000-0000-0000-000000000601';
update orders set estado='listo', created_by='00000000-0000-0000-0000-000000000102' where id='00000000-0000-0000-0000-000000000601';

-- Ver historial
select 'Historial' as test, estado_anterior, estado_nuevo, changed_at from order_status_history where order_id='00000000-0000-0000-0000-000000000601' order by changed_at;

-- D. Vistas dashboard
select 'v_pedidos_activos' as test, * from v_pedidos_activos where restaurant_id='00000000-0000-0000-0000-000000000001';
select 'v_dashboard' as test, * from v_dashboard where restaurant_id='00000000-0000-0000-0000-000000000001';

-- E. Ver consécutivo por restaurante
select 'Contador' as test, * from restaurant_counters where restaurant_id='00000000-0000-0000-0000-000000000001';

-- F. Probar analítica
insert into qr_scans (restaurant_id, mesa_id) values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000401');
insert into product_views (restaurant_id, product_id, source) values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', '3d');
select 'Analitica OK' as test, (select count(*) from qr_scans) as scans, (select count(*) from product_views) as views;
