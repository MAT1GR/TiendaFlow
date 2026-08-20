-- ---------------------------------------------------------------------------
-- TiendaFlow — schema Postgres / Supabase
--
-- Equivalente al schema SQLite de src/lib/db/schema.sql, con las mismas
-- entidades y, además, Row Level Security por workspace.
--
-- En SQLite el aislamiento entre workspaces lo garantiza la capa de acceso a
-- datos (src/lib/repo.ts: toda consulta filtra por workspace_id). Acá lo
-- garantiza la base: aunque una consulta se olvide del filtro, RLS no devuelve
-- filas de otro workspace.
--
-- Uso:
--   psql "$DATABASE_URL" -f supabase/schema.sql
--   o pegarlo en el SQL Editor de Supabase.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Identidad
--
-- Con Supabase Auth, `users.id` referencia `auth.users(id)`. Si se usa la
-- autenticación propia de la app, quitá esa foreign key y conservá la tabla.
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,
  full_name text not null,
  avatar_url text,
  provider text not null default 'password',
  onboarding_completed boolean not null default false,
  onboarding_answers jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  country text not null default 'AR',
  currency text not null default 'ARS',
  tax_id text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index if not exists idx_members_user on public.workspace_members(user_id);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  subtitle text,
  description text,
  short_description text,
  type text not null default 'ebook',
  status text not null default 'draft',
  category text,
  audience text,
  main_problem text,
  transformation text,
  benefits jsonb,
  cover_url text,
  cover_style jsonb,
  base_price numeric(12,2) not null default 0,
  currency text not null default 'ARS',
  delivery_type text not null default 'download',
  delivery_message text,
  source text not null default 'manual',
  outline jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_ws on public.products(workspace_id);

create table if not exists public.product_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  file_name text not null,
  file_type text,
  file_size bigint not null default 0,
  storage_key text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_files_product on public.product_files(product_id);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  slug text not null,
  headline text,
  promise text,
  benefits jsonb,
  cta_text text not null default 'Quiero mi acceso',
  guarantee text,
  price numeric(12,2) not null default 0,
  compare_at_price numeric(12,2),
  currency text not null default 'ARS',
  status text not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);
create index if not exists idx_offers_ws on public.offers(workspace_id);

create table if not exists public.bonuses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  description text,
  value numeric(12,2) not null default 0,
  image_url text,
  file_name text,
  status text not null default 'active',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bonuses_offer on public.bonuses(offer_id);

create table if not exists public.order_bumps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  description text,
  checkbox_label text not null default 'Sí, quiero agregar este complemento',
  price numeric(12,2) not null default 0,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bumps_offer on public.order_bumps(offer_id);

create table if not exists public.upsells (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  headline text,
  description text,
  price numeric(12,2) not null default 0,
  compare_at_price numeric(12,2),
  accept_label text not null default 'Sí, lo quiero agregar',
  decline_label text not null default 'No gracias, seguir sin esto',
  position int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_upsells_offer on public.upsells(offer_id);

create table if not exists public.downsells (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  upsell_id uuid references public.upsells(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  headline text,
  description text,
  price numeric(12,2) not null default 0,
  compare_at_price numeric(12,2),
  accept_label text not null default 'Dale, lo quiero así',
  decline_label text not null default 'No, gracias',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Funnels y landings
-- ---------------------------------------------------------------------------

create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  name text not null,
  slug text not null,
  status text not null default 'draft',
  traffic_source text not null default 'meta_ads',
  published_url text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);
create index if not exists idx_funnels_ws on public.funnels(workspace_id);

create table if not exists public.funnel_steps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  type text not null,
  name text not null,
  position int not null default 0,
  config jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_steps_funnel on public.funnel_steps(funnel_id);

create table if not exists public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  funnel_step_id uuid references public.funnel_steps(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete set null,
  name text not null,
  slug text not null,
  status text not null default 'draft',
  theme jsonb,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table if not exists public.landing_sections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  landing_page_id uuid not null references public.landing_pages(id) on delete cascade,
  type text not null,
  position int not null default 0,
  content jsonb,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sections_page on public.landing_sections(landing_page_id);

-- ---------------------------------------------------------------------------
-- Clientes y ventas
-- ---------------------------------------------------------------------------

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  country text,
  status text not null default 'new',
  total_spent numeric(12,2) not null default 0,
  orders_count int not null default 0,
  last_purchase_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, email)
);
create index if not exists idx_customers_ws on public.customers(workspace_id);

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  full_name text not null,
  email text not null,
  status text not null default 'active',
  commission_rate numeric(5,2) not null default 30,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  funnel_id uuid references public.funnels(id) on delete set null,
  affiliate_id uuid references public.affiliates(id) on delete set null,
  reference text not null unique,
  status text not null default 'pending',
  subtotal numeric(12,2) not null default 0,
  bump_total numeric(12,2) not null default 0,
  upsell_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'ARS',
  access_token text unique,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_ws on public.orders(workspace_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  kind text not null default 'main',
  name text not null,
  quantity int not null default 1,
  unit_price numeric(12,2) not null default 0,
  downloads_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_items_order on public.order_items(order_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'manual',
  provider_payment_id text,
  status text not null default 'pending',
  amount numeric(12,2) not null default 0,
  currency text not null default 'ARS',
  error_message text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Marketing y atribución
-- ---------------------------------------------------------------------------

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  funnel_id uuid references public.funnels(id) on delete set null,
  name text not null,
  platform text not null default 'meta',
  objective text,
  status text not null default 'draft',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  daily_budget numeric(12,2) not null default 0,
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attribution_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  funnel_id uuid references public.funnels(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  session_key text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  landing_path text,
  created_at timestamptz not null default now()
);
create index if not exists idx_attr_ws on public.attribution_events(workspace_id, created_at desc);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  funnel_id uuid references public.funnels(id) on delete set null,
  funnel_step_id uuid references public.funnel_steps(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  session_key text,
  name text not null,
  value numeric(12,2) not null default 0,
  metadata jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_ws on public.analytics_events(workspace_id, created_at desc);
create index if not exists idx_events_name on public.analytics_events(workspace_id, name);

-- ---------------------------------------------------------------------------
-- Afiliados
-- ---------------------------------------------------------------------------

create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  funnel_id uuid references public.funnels(id) on delete set null,
  code text not null unique,
  clicks bigint not null default 0,
  conversions bigint not null default 0,
  revenue numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(12,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Integraciones, dominios, IA, billing, notificaciones
--
-- `secret_config` guarda tokens y claves secretas. Nunca se expone al cliente:
-- las policies de abajo cubren la tabla completa, y la app solo lee ese campo
-- desde el servidor (src/lib/integrations/*).
-- ---------------------------------------------------------------------------

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  public_config jsonb,
  secret_config jsonb,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  hostname text not null,
  type text not null default 'custom',
  status text not null default 'pending',
  ssl_status text not null default 'pending',
  is_default boolean not null default false,
  verification_token text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, hostname)
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  task text not null,
  provider text not null default 'template',
  model text,
  input jsonb,
  output jsonb,
  status text not null default 'ok',
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_ws on public.ai_generations(workspace_id, created_at desc);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade unique,
  plan text not null default 'starter',
  status text not null default 'trialing',
  provider text,
  provider_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_ws on public.notifications(workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--
-- Regla única: un usuario solo ve filas cuyo workspace_id esté entre los
-- workspaces donde es miembro. Se aplica a TODAS las tablas con workspace_id.
-- ---------------------------------------------------------------------------

create or replace function public.current_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.workspace_members where user_id = auth.uid();
$$;

do $$
declare
  target text;
begin
  foreach target in array array[
    'products', 'product_files', 'offers', 'bonuses', 'order_bumps', 'upsells',
    'downsells', 'funnels', 'funnel_steps', 'landing_pages', 'landing_sections',
    'customers', 'orders', 'order_items', 'payments', 'campaigns',
    'attribution_events', 'analytics_events', 'affiliates', 'affiliate_links',
    'commissions', 'integrations', 'domains', 'ai_generations', 'subscriptions',
    'notifications'
  ]
  loop
    execute format('alter table public.%I enable row level security', target);
    execute format('drop policy if exists tf_workspace_isolation on public.%I', target);
    execute format($p$
      create policy tf_workspace_isolation on public.%I
        for all
        using (workspace_id in (select public.current_workspace_ids()))
        with check (workspace_id in (select public.current_workspace_ids()))
    $p$, target);
  end loop;
end
$$;

-- Workspaces: solo los propios.
alter table public.workspaces enable row level security;
drop policy if exists tf_workspaces_isolation on public.workspaces;
create policy tf_workspaces_isolation on public.workspaces
  for all
  using (id in (select public.current_workspace_ids()))
  with check (owner_id = auth.uid());

-- Membresías: cada usuario ve solo las suyas.
alter table public.workspace_members enable row level security;
drop policy if exists tf_members_isolation on public.workspace_members;
create policy tf_members_isolation on public.workspace_members
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Usuarios: cada uno ve solo su propia fila.
alter table public.users enable row level security;
drop policy if exists tf_users_self on public.users;
create policy tf_users_self on public.users
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- Sesiones y tokens de recuperación: nunca accesibles desde el cliente.
-- Sin policies + RLS activo = solo la service role puede tocarlas.
alter table public.sessions enable row level security;
alter table public.password_reset_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- NOTA SOBRE LAS PÁGINAS PÚBLICAS
--
-- Las landings, checkouts y páginas de gracias son públicas y las sirve el
-- servidor de Next.js con la service role, resolviendo el workspace a partir
-- del slug del funnel. Nunca se expone la anon key con permisos de lectura
-- sobre estas tablas: si en el futuro se quisiera leer desde el cliente,
-- corresponde crear vistas específicas con solo los campos publicables.
-- ---------------------------------------------------------------------------
