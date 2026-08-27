-- OnlyFood - Schema Supabase (Postgres) - Multi-tenant
-- Ejecutar en Supabase SQL Editor (supabase.com/dashboard -> SQL Editor)
-- Stack: Postgres + Auth + Realtime + Storage

-- 1. Extensiones
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Tipos
do $$ begin
  create type order_status as enum ('nuevo','en_preparacion','listo','entregado','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mesa_estado as enum ('libre','ocupada','reservada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type model_status as enum ('pendiente','generando','listo','error');
exception when duplicate_object then null; end $$;

-- 3. Tabla restaurantes (tenant)
create table if not exists restaurants (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  slug text unique not null, -- para URL: onlyfood.com/r/slug
  descripcion text,
  logo_url text,
  telefono text,
  direccion text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Perfiles (extiende auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  email text not null,
  rol text not null check (rol in ('admin','cocina','mesero')),
  nombre text,
  created_at timestamptz default now()
);

-- 5. Categorias
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

-- 6. Productos
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  nombre text not null,
  descripcion text,
  precio numeric(10,2) not null check (precio >= 0),
  imagen_url text,
  disponible boolean default true,
  destacado boolean default false,
  ingredientes text, -- csv o json simple
  alergenos text,
  info_nutricional jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_products_restaurant on products(restaurant_id);
create index if not exists idx_products_category on products(category_id);

-- 7. Extras / Variantes por producto
create table if not exists extras (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  nombre text not null, -- Ej: "Queso extra", "Sin cebolla"
  precio numeric(10,2) default 0,
  created_at timestamptz default now()
);

create table if not exists product_extras (
  product_id uuid not null references products(id) on delete cascade,
  extra_id uuid not null references extras(id) on delete cascade,
  primary key (product_id, extra_id)
);

-- 8. Mesas (evitamos nombre reservado "tables")
create table if not exists mesas (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  numero int not null,
  nombre text, -- "Mesa 01 - Terraza"
  estado mesa_estado default 'libre',
  qr_token text unique not null default encode(gen_random_bytes(16), 'hex'), -- token unico para QR
  created_at timestamptz default now(),
  unique(restaurant_id, numero)
);
create index if not exists idx_mesas_restaurant on mesas(restaurant_id);
create index if not exists idx_mesas_qr on mesas(qr_token);

-- 9. Pedidos
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  mesa_id uuid not null references mesas(id) on delete restrict,
  numero_pedido serial, -- consecutivo legible por restaurante?
  estado order_status default 'nuevo',
  total numeric(10,2) not null default 0,
  notas text,
  cliente_nombre text, -- opcional
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- Para numero_pedido por restaurante, usamos sequence + trigger abajo
create index if not exists idx_orders_restaurant on orders(restaurant_id);
create index if not exists idx_orders_mesa on orders(mesa_id);
create index if not exists idx_orders_estado on orders(estado);
create index if not exists idx_orders_created on orders(created_at desc);

-- 10. Items del pedido
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  notas text,
  created_at timestamptz default now()
);
create index if not exists idx_order_items_order on order_items(order_id);

create table if not exists order_item_extras (
  id uuid primary key default uuid_generate_v4(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  extra_id uuid not null references extras(id) on delete restrict,
  precio numeric(10,2) not null
);

-- 11. Modelos 3D por producto
create table if not exists product_models (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  status model_status default 'pendiente',
  glb_url text,
  usdz_url text, -- para iOS AR
  source_images text[], -- URLs de fotos origen
  provider text, -- meshy, tripo, luma
  provider_job_id text,
  error_msg text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_models_product on product_models(product_id);

-- 12. Analítica básica (para MVP5, luego puede ir a tabla separada o Clickhouse)
create table if not exists qr_scans (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  mesa_id uuid references mesas(id) on delete set null,
  scanned_at timestamptz default now(),
  user_agent text,
  ip text
);
create index if not exists idx_qr_scans_restaurant on qr_scans(restaurant_id, scanned_at);

create table if not exists product_views (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  mesa_id uuid references mesas(id) on delete set null,
  viewed_at timestamptz default now(),
  source text -- 'menu', '3d', 'ar'
);

-- 13. Triggers updated_at
create or replace function update_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_restaurants_updated on restaurants;
create trigger trg_restaurants_updated before update on restaurants for each row execute function update_updated_at();
drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products for each row execute function update_updated_at();
drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders for each row execute function update_updated_at();
drop trigger if exists trg_models_updated on product_models;
create trigger trg_models_updated before update on product_models for each row execute function update_updated_at();

-- 14. RLS (Row Level Security) - activar y políticas básicas
-- Por ahora desactivado para hackatón rápido, activar luego:
-- alter table restaurants enable row level security;
-- alter table products enable row level security;
-- etc. Para MVP, usar service_role en backend y filtrar por restaurant_id en queries.

-- 15. Realtime - habilitar para pedidos
-- En Supabase Dashboard -> Database -> Realtime -> activar tabla orders y mesas
-- O via SQL:
-- alter publication supabase_realtime add table orders;
-- alter publication supabase_realtime add table mesas;

-- 16. Storage buckets (crear en Dashboard -> Storage)
-- buckets: product-images, product-models, qr-codes
-- insert into storage.buckets (id, name, public) values ('product-images','product-images', true);
-- insert into storage.buckets (id, name, public) values ('product-models','product-models', true);

-- 17. Datos de prueba (opcional)
-- insert into restaurants (nombre, slug) values ('Demo Restaurante', 'demo');
-- insert into categories (restaurant_id, nombre) values ((select id from restaurants where slug='demo'), 'Hamburguesas');
