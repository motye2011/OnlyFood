-- OnlyFood - Schema Completo Supabase (Postgres) - Multi-tenant
-- Ejecutar en Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- Incluye: Restaurantes, Perfiles Admin/Trabajador, Mesas/QR, Pedidos con estados, 3D, Analítica
-- Realtime + RLS + Triggers incluidos

-- ============================================================
-- 0. LIMPIEZA SEGURA (para re-ejecutar sin error)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 2. TIPOS ENUM
-- ============================================================
do $$ begin create type user_rol as enum ('admin','trabajador'); exception when duplicate_object then null; end $$;
do $$ begin create type trabajador_tipo as enum ('cocina','mesero','cajero','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type order_status as enum ('nuevo','en_preparacion','listo','entregado','cancelado'); exception when duplicate_object then null; end $$;
do $$ begin create type mesa_estado as enum ('libre','ocupada','reservada','fuera_servicio'); exception when duplicate_object then null; end $$;
do $$ begin create type model_status as enum ('pendiente','generando','listo','error'); exception when duplicate_object then null; end $$;

-- ============================================================
-- 3. RESTAURANTES (TENANT PRINCIPAL)
-- ============================================================
create table if not exists restaurants (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  slug text unique not null, -- ej: onlyfood.com/r/slug o /menu/slug
  descripcion text,
  logo_url text,
  telefono text,
  direccion text,
  horario jsonb, -- {"lunes":"8-22", ...}
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_restaurants_slug on restaurants(slug);

-- ============================================================
-- 4. PERFILES ADMIN / TRABAJADOR (extiende auth.users)
-- ============================================================
-- DONDE SE GUARDA EL PERFIL:
-- Cada usuario de Supabase Auth (auth.users) tiene una fila aquí con su restaurant_id y rol.
-- admin = dueño, puede todo (productos, mesas, pedidos, workers, config)
-- trabajador = cocina/mesero/cajero, permisos limitados según trabajador_tipo
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  email text not null,
  nombre text not null,
  rol user_rol not null default 'trabajador', -- admin o trabajador
  trabajador_tipo trabajador_tipo default 'mesero', -- solo si rol=trabajador
  avatar_url text,
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(email, restaurant_id)
);
create index if not exists idx_profiles_restaurant on profiles(restaurant_id);
create index if not exists idx_profiles_rol on profiles(rol);

-- ============================================================
-- 5. CATEGORIAS
-- ============================================================
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  nombre text not null,
  descripcion text,
  orden int default 0,
  activo boolean default true,
  created_at timestamptz default now(),
  unique(restaurant_id, nombre)
);
create index if not exists idx_categories_restaurant on categories(restaurant_id);

-- ============================================================
-- 6. PRODUCTOS
-- ============================================================
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  nombre text not null,
  descripcion text,
  precio numeric(10,2) not null check (precio >= 0),
  imagen_url text, -- imagen principal (compatibilidad), usar product_images para galería
  disponible boolean default true,
  destacado boolean default false,
  ingredientes text,
  alergenos text,
  info_nutricional jsonb,
  tiempo_preparacion_min int, -- para cocina
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_products_restaurant on products(restaurant_id);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_disponible on products(restaurant_id, disponible);

-- Galería de imágenes por producto (opcional, hasta 5 por producto para 3D)
create table if not exists product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  orden int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_product_images_product on product_images(product_id);

-- ============================================================
-- 7. EXTRAS
-- ============================================================
create table if not exists extras (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  nombre text not null,
  precio numeric(10,2) default 0 check (precio >= 0),
  disponible boolean default true,
  created_at timestamptz default now(),
  unique(restaurant_id, nombre)
);
create table if not exists product_extras (
  product_id uuid not null references products(id) on delete cascade,
  extra_id uuid not null references extras(id) on delete cascade,
  primary key (product_id, extra_id)
);

-- ============================================================
-- 8. MESAS + QR + SESIONES CLIENTE
-- ============================================================
create table if not exists mesas (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  numero int not null,
  nombre text, -- "Mesa 01 - Terraza"
  capacidad int default 4,
  estado mesa_estado default 'libre',
  qr_token text unique not null default encode(gen_random_bytes(16), 'hex'), -- token inmutable para QR
  qr_url text, -- se genera en app: /r/{slug}/m/{qr_token}
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(restaurant_id, numero)
);
create index if not exists idx_mesas_restaurant on mesas(restaurant_id);
create index if not exists idx_mesas_qr on mesas(qr_token);
create index if not exists idx_mesas_estado on mesas(restaurant_id, estado);

-- Sesiones de cliente tras escanear QR (para asociar pedidos a mesa sin login)
create table if not exists mesa_sessions (
  id uuid primary key default uuid_generate_v4(),
  mesa_id uuid not null references mesas(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  user_agent text,
  ip text,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '4 hours'
);
create index if not exists idx_sessions_mesa on mesa_sessions(mesa_id);
create index if not exists idx_sessions_token on mesa_sessions(token);

-- ============================================================
-- 9. PEDIDOS - DONDE SE GUARDAN PENDIENTES / EN PROCESO
-- ============================================================
-- TODOS los pedidos van aquí. El estado define la cola:
-- 'nuevo' = pendiente por aceptar (cola entrada)
-- 'en_preparacion' = en cocina
-- 'listo' = listo para entregar
-- 'entregado' = finalizado
-- 'cancelado' = cancelado
-- Realtime escucha esta tabla para actualizar panel y cliente en <1s
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  mesa_id uuid not null references mesas(id) on delete restrict,
  session_id uuid references mesa_sessions(id) on delete set null,
  numero int not null, -- consecutivo POR restaurante (ej: #1023)
  estado order_status not null default 'nuevo',
  total numeric(10,2) not null default 0 check (total >= 0),
  subtotal numeric(10,2) default 0,
  notas text,
  cliente_nombre text,
  created_by uuid references profiles(id), -- quien cambió estado último
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  delivered_at timestamptz
);
create index if not exists idx_orders_restaurant on orders(restaurant_id);
create index if not exists idx_orders_mesa on orders(mesa_id);
create index if not exists idx_orders_estado on orders(restaurant_id, estado);
create index if not exists idx_orders_created on orders(restaurant_id, created_at desc);
-- Índice clave para colas: pendientes y en proceso
create index if not exists idx_orders_pendientes on orders(restaurant_id, estado) where estado in ('nuevo','en_preparacion','listo');

-- Contador por restaurante para numero consecutivo
create table if not exists restaurant_counters (
  restaurant_id uuid primary key references restaurants(id) on delete cascade,
  next_order_num int not null default 1
);

-- Función para asignar numero consecutivo por restaurante
create or replace function assign_order_number() returns trigger as $$
declare next_num int;
begin
  insert into restaurant_counters (restaurant_id, next_order_num)
  values (new.restaurant_id, 1)
  on conflict (restaurant_id) do nothing;

  update restaurant_counters
  set next_order_num = next_order_num + 1
  where restaurant_id = new.restaurant_id
  returning next_order_num - 1 into next_num;

  new.numero := next_num;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_assign_order_number on orders;
create trigger trg_assign_order_number before insert on orders for each row execute function assign_order_number();

-- ============================================================
-- 10. ITEMS DEL PEDIDO
-- ============================================================
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  product_nombre text not null, -- snapshot por si cambia nombre luego
  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  notas text,
  created_at timestamptz default now()
);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_order_items_product on order_items(product_id);

create table if not exists order_item_extras (
  id uuid primary key default uuid_generate_v4(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  extra_id uuid not null references extras(id) on delete restrict,
  extra_nombre text not null,
  precio numeric(10,2) not null default 0
);

-- Trigger para recalcular total del pedido al insertar/actualizar items
create or replace function recalc_order_total() returns trigger as $$
begin
  update orders set
    subtotal = (select coalesce(sum(subtotal),0) from order_items where order_id = coalesce(new.order_id, old.order_id)),
    total = (select coalesce(sum(subtotal),0) + coalesce((select sum(precio) from order_item_extras where order_item_id in (select id from order_items where order_id = coalesce(new.order_id, old.order_id))),0) from order_items where order_id = coalesce(new.order_id, old.order_id)),
    updated_at = now()
  where id = coalesce(new.order_id, old.order_id);
  return coalesce(new, old);
end; $$ language plpgsql;

drop trigger if exists trg_recalc_total_insert on order_items;
create trigger trg_recalc_total_insert after insert or update or delete on order_items for each row execute function recalc_order_total();

-- ============================================================
-- 11. HISTORIAL DE ESTADOS (AUDITORIA - para Luna y panel)
-- ============================================================
create table if not exists order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  estado_anterior order_status,
  estado_nuevo order_status not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz default now(),
  notas text
);
create index if not exists idx_history_order on order_status_history(order_id, changed_at);

create or replace function log_status_change() returns trigger as $$
begin
  if old.estado is distinct from new.estado then
    insert into order_status_history (order_id, estado_anterior, estado_nuevo, changed_by)
    values (new.id, old.estado, new.estado, new.created_by);
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_log_status on orders;
create trigger trg_log_status after update on orders for each row execute function log_status_change();

-- También actualiza estado de mesa automáticamente
create or replace function sync_mesa_estado() returns trigger as $$
begin
  -- Si hay pedidos activos en mesa, marcar ocupada; si no, libre
  if new.estado in ('nuevo','en_preparacion','listo') then
    update mesas set estado = 'ocupada', updated_at = now() where id = new.mesa_id;
  elsif new.estado = 'entregado' then
    -- verifica si quedan pedidos activos en esa mesa
    if not exists (select 1 from orders where mesa_id = new.mesa_id and estado in ('nuevo','en_preparacion','listo') and id != new.id) then
      update mesas set estado = 'libre', updated_at = now() where id = new.mesa_id;
    end if;
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_sync_mesa on orders;
create trigger trg_sync_mesa after insert or update on orders for each row execute function sync_mesa_estado();

-- ============================================================
-- 12. MODELOS 3D
-- ============================================================
create table if not exists product_models (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  status model_status default 'pendiente',
  glb_url text,
  usdz_url text,
  source_images text[],
  provider text, -- meshy, tripo
  provider_job_id text,
  error_msg text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_models_product on product_models(product_id);
create index if not exists idx_models_restaurant on product_models(restaurant_id);

-- ============================================================
-- 13. ANALITICA (MVP5)
-- ============================================================
create table if not exists qr_scans (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  mesa_id uuid references mesas(id) on delete set null,
  session_id uuid references mesa_sessions(id) on delete set null,
  scanned_at timestamptz default now(),
  user_agent text,
  ip text
);
create index if not exists idx_qr_scans_restaurant on qr_scans(restaurant_id, scanned_at desc);

create table if not exists product_views (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  mesa_id uuid references mesas(id) on delete set null,
  viewed_at timestamptz default now(),
  source text check (source in ('menu','3d','ar','carrito'))
);
create index if not exists idx_views_product on product_views(product_id, viewed_at);

create table if not exists model_views (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  tipo text check (tipo in ('3d','ar')),
  viewed_at timestamptz default now()
);

-- ============================================================
-- 14. TRIGGERS updated_at
-- ============================================================
create or replace function update_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_restaurants_updated on restaurants;
create trigger trg_restaurants_updated before update on restaurants for each row execute function update_updated_at();
drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles for each row execute function update_updated_at();
drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products for each row execute function update_updated_at();
drop trigger if exists trg_mesas_updated on mesas;
create trigger trg_mesas_updated before update on mesas for each row execute function update_updated_at();
drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders for each row execute function update_updated_at();
drop trigger if exists trg_models_updated on product_models;
create trigger trg_models_updated before update on product_models for each row execute function update_updated_at();

-- ============================================================
-- 15. VISTAS UTILES PARA PANEL
-- ============================================================
-- Vista: pedidos pendientes/en proceso/listo por restaurante (cola cocina)
create or replace view v_pedidos_activos as
select o.id, o.restaurant_id, o.mesa_id, m.numero as mesa_numero, o.numero, o.estado, o.total, o.created_at,
       count(oi.id) as items_count
from orders o
join mesas m on m.id = o.mesa_id
left join order_items oi on oi.order_id = o.id
where o.estado in ('nuevo','en_preparacion','listo')
group by o.id, m.numero
order by o.created_at asc;

-- Vista: dashboard por restaurante
create or replace view v_dashboard as
select r.id as restaurant_id,
  (select count(*) from orders where restaurant_id = r.id and estado = 'nuevo') as nuevos,
  (select count(*) from orders where restaurant_id = r.id and estado = 'en_preparacion') as en_preparacion,
  (select count(*) from orders where restaurant_id = r.id and estado = 'listo') as listos,
  (select count(*) from mesas where restaurant_id = r.id and estado = 'ocupada') as mesas_ocupadas,
  (select coalesce(sum(total),0) from orders where restaurant_id = r.id and estado = 'entregado' and created_at::date = current_date) as ventas_hoy
from restaurants r;

-- ============================================================
-- 16. STORAGE BUCKETS (ejecutar si no existen - descomentar)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('product-images','product-images', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('product-models','product-models', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('restaurant-logos','restaurant-logos', true) on conflict do nothing;

-- ============================================================
-- 17. REALTIME (descomentar si no está activo en Dashboard)
-- ============================================================
-- alter publication supabase_realtime add table orders;
-- alter publication supabase_realtime add table mesas;
-- alter publication supabase_realtime add table order_items;

-- ============================================================
-- 18. RLS - Para hackaton dejar desactivado y filtrar por restaurant_id en backend
-- Activar en prod: descomentar y crear políticas
-- ============================================================
-- alter table restaurants enable row level security;
-- alter table profiles enable row level security;
-- alter table products enable row level security;
-- alter table orders enable row level security;
-- create policy "users can see own restaurant" on restaurants for select using (id in (select restaurant_id from profiles where id = auth.uid()));
-- etc.

-- ============================================================
-- 19. DATOS DEMO (opcional - descomentar para probar)
-- ============================================================
-- insert into restaurants (nombre, slug, descripcion) values ('Demo OnlyFood', 'demo', 'Restaurante de prueba') returning id;
-- -- luego crear perfil admin manualmente tras registro en Auth
