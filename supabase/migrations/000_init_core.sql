-- Extensions used by our schema
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "citext";

-- Product Groups
create table if not exists product_groups (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  workflow_profile text not null check (workflow_profile in ('vape','nonvape')),
  verify_behavior text not null check (
    (workflow_profile='vape' and verify_behavior='auth_till_kedai') or
    (workflow_profile='nonvape' and verify_behavior='auth_till_consumer')
  ),
  created_at timestamptz default now()
);

-- QR Settings (per Product Group)
create table if not exists qr_settings (
  id uuid primary key default gen_random_uuid(),
  product_group_id uuid not null references product_groups(id) on delete cascade,
  units_per_master int not null check (units_per_master between 10 and 500),
  buffer_per_1000 int not null check (buffer_per_1000 >= 0),
  unique (product_group_id)
);

-- Manufacturers
create table if not exists manufacturers (
  id uuid primary key default gen_random_uuid(),
  product_group_id uuid not null references product_groups(id) on delete cascade,
  code text unique not null,
  name text not null,
  email text, phone text, address text, country text,
  created_at timestamptz default now()
);

-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  product_group_id uuid not null references product_groups(id) on delete cascade,
  code text unique not null,
  name citext not null,
  requires_regulatory boolean default false,
  unique (product_group_id, name)
);

-- Brands
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  product_group_id uuid not null references product_groups(id) on delete cascade,
  category_id uuid not null references categories(id) on delete restrict,
  code text unique not null,
  name citext not null,
  unique (product_group_id, category_id, name)
);

-- Products (tangible attrs + optional manufacturer)
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  product_group_id uuid not null references product_groups(id) on delete cascade,
  category_id uuid not null references categories(id) on delete restrict,
  brand_id uuid not null references brands(id) on delete restrict,
  manufacturer_id uuid references manufacturers(id) on delete restrict,
  code text unique not null,
  name citext not null,
  image_path text, image_url text,
  short_description text, long_description text,
  flavour text,
  price_cents integer, currency_code text default 'MYR',
  country_of_origin text, weight_g numeric,
  nicotine_free boolean, -- <--- add here
  nicotine_strength_mg_per_ml numeric, -- <--- add here
  volume_ml numeric, -- <--- add here
  child_resistant boolean, -- <--- add here
  -- (regulatory columns trimmed for bootstrap)
  created_at timestamptz default now(),
  unique (product_group_id, brand_id, name)
);

-- Roles mapping
create table if not exists user_group_roles (
  user_id uuid not null,
  product_group_id uuid not null references product_groups(id) on delete cascade,
  role text not null,
  primary key (user_id, product_group_id, role)
);

-- Orders (HQ -> Manufacturer)
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  product_group_id uuid not null references product_groups(id) on delete cascade,
  code text unique not null,
  manufacturer_id uuid references manufacturers(id) on delete restrict,
  notes text,
  status text not null check (status in ('pending_approval','approved','po_sent','payment_notified','payment_verified')) default 'pending_approval',
  approved_by_id_1 uuid, approved_at_1 timestamptz,
  approved_by_id_2 uuid, approved_at_2 timestamptz,
  po_code text, po_sent_at timestamptz,
  payment_notified_at timestamptz,
  payment_verified_by uuid, payment_verified_at timestamptz,
  created_at timestamptz default now()
);

-- Order approvals (L1/L2 + optional mfr verification)
create table if not exists order_approvals (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  approval_type text not null check (approval_type in ('hq_l1','hq_l2','mfr_payment_verified')),
  approver_id uuid not null,
  approver_role text not null,
  approved_at timestamptz not null default now(),
  comment text,
  unique (order_id, approval_type)
);
