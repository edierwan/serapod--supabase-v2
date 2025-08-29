-- Add manufacturer_id (optional, exclusive when set)
alter table products
  add column if not exists manufacturer_id uuid references manufacturers(id) on delete restrict;

-- Tangible attrs (if you created the table very early these may exist already; IF NOT EXISTS is safe)
alter table products
  add column if not exists image_path                text,
  add column if not exists image_url                 text,
  add column if not exists short_description         text,
  add column if not exists long_description          text,
  add column if not exists flavour                   text,
  add column if not exists price_cents               integer,
  add column if not exists currency_code             text default 'MYR',
  add column if not exists country_of_origin         text,
  add column if not exists weight_g                  numeric;

-- Regulatory Option-B
alter table products
  add column if not exists nicotine_free                     boolean default false,
  add column if not exists nicotine_strength_mg_per_ml       numeric,
  add column if not exists volume_ml                         numeric,
  add column if not exists child_resistant_packaging         boolean,
  add column if not exists batch_lot                         text,
  add column if not exists mfg_date                          date,
  add column if not exists expiry_date                       date,
  add column if not exists pg_vg_ratio                       text,
  add column if not exists warning_profile_code              text,
  add column if not exists msds_url                          text,
  add column if not exists age_restriction                   int;

-- Helpful unique to avoid dup names under same brand (if your base migration missed it)
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'uq_products_group_brand_name'
  ) then
    execute 'create unique index uq_products_group_brand_name on products(product_group_id, brand_id, lower(name))';
  end if;
end$$;
