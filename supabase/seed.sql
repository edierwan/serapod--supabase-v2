-- === Product Groups (profile ⇒ derived verify) ===
insert into product_groups (code,name,workflow_profile,verify_behavior)
values ('VAPE','Vape','vape','auth_till_kedai'),
       ('CAMP','Camping','nonvape','auth_till_consumer')
on conflict (code) do nothing;

-- === QR Settings (config-driven batch math) ===
insert into qr_settings (product_group_id, units_per_master, buffer_per_1000)
select id, 200, 100 from product_groups where code='VAPE'
on conflict (product_group_id) do update
  set units_per_master=excluded.units_per_master, buffer_per_1000=excluded.buffer_per_1000;

insert into qr_settings (product_group_id, units_per_master, buffer_per_1000)
select id, 100, 50 from product_groups where code='CAMP'
on conflict (product_group_id) do update
  set units_per_master=excluded.units_per_master, buffer_per_1000=excluded.buffer_per_1000;

-- === Manufacturers (HQ→Manufacturer flow) ===
insert into manufacturers (product_group_id, code, name, email, phone, address, country)
select id, 'MFR-SERAPOD', 'Serapod Factory', 'ops@factory.example', '+60-12-0000000', 'Somewhere, MY', 'MY'
from product_groups where code='VAPE'
on conflict (code) do nothing;

-- === Categories & Brands (VAPE) ===
with pg as (
  select id from product_groups where code='VAPE'
)
insert into categories (product_group_id, code, name, requires_regulatory)
select pg.id, 'CAT-CLOSEPOD', 'ClosePod', true from pg
on conflict (product_group_id, name) do nothing;

with ctx as (
  select pg.id as pg_id, c.id as cat_id
  from product_groups pg
  join categories c on c.product_group_id=pg.id and c.code='CAT-CLOSEPOD'
  where pg.code='VAPE'
)
insert into brands (product_group_id, category_id, code, name)
select ctx.pg_id, ctx.cat_id, 'BRD-SERAX', 'SeraX' from ctx
on conflict (product_group_id, category_id, name) do nothing;

-- === Example Product (tangible attrs + image placeholder) ===
with ctx as (
  select pg.id as pg_id, c.id as cat_id, b.id as brand_id, m.id as mfr_id
  from product_groups pg
  join categories c on c.product_group_id=pg.id and c.code='CAT-CLOSEPOD'
  join brands b on b.product_group_id=pg.id and b.code='BRD-SERAX'
  left join manufacturers m on m.product_group_id=pg.id and m.code='MFR-SERAPOD'
  where pg.code='VAPE'
)
insert into products (
  product_group_id, category_id, brand_id, manufacturer_id,
  code, name, image_url,
  short_description, long_description,
  flavour, price_cents, country_of_origin, weight_g,
  nicotine_free, nicotine_strength_mg_per_ml, volume_ml, child_resistant_packaging
)
select ctx.pg_id, ctx.cat_id, ctx.brand_id, ctx.mfr_id,
       'PRD-000001', 'SeraX Strawberry 30ml', 'https://img-wrapper.vercel.app/image?url=https://placehold.co/512x512.png?text=Product',
       'Strawberry vape e-liquid', 'Smooth strawberry profile',
       'Strawberry', 1999, 'MY', 120,
       false, 12, 30, true
from ctx
on conflict (code) do nothing;

-- === CAMP (optional demo) ===
with pg as (select id from product_groups where code='CAMP')
insert into categories (product_group_id, code, name)
select pg.id, 'CAT-GADGET', 'Gadgets' from pg
on conflict (product_group_id, name) do nothing;

with ctx as (
  select pg.id as pg_id, c.id as cat_id
  from product_groups pg
  join categories c on c.product_group_id=pg.id and c.code='CAT-GADGET'
  where pg.code='CAMP'
)
insert into brands (product_group_id, category_id, code, name)
select ctx.pg_id, ctx.cat_id, 'BRD-SERAOUT', 'SeraOutdoor' from ctx
on conflict (product_group_id, category_id, name) do nothing;

-- === Demo order (pending_approval) ===
with ctx as (
  select g.id as pg_id, m.id as mfr_id, p.id as prod_id
  from product_groups g
  join manufacturers m on m.product_group_id=g.id and m.code='MFR-SERAPOD'
  join products p on p.product_group_id=g.id and p.code='PRD-000001'
  where g.code='VAPE'
)
insert into orders (product_group_id, code, manufacturer_id, notes)
select ctx.pg_id, 'PO-DEMO-000001', ctx.mfr_id, 'Demo order for batch testing' from ctx
on conflict (code) do nothing;

-- === Simulate approvals (L1 + L2) ===
with o as (select id from orders where code='PO-DEMO-000001')
insert into order_approvals (order_id, approval_type, approver_id, approver_role)
select o.id, 'hq_l1', gen_random_uuid(), 'hq' from o
on conflict do nothing;

with o as (select id from orders where code='PO-DEMO-000001')
insert into order_approvals (order_id, approval_type, approver_id, approver_role)
select o.id, 'hq_l2', gen_random_uuid(), 'hq' from o
on conflict do nothing;

update orders
set status='approved',
    approved_by_id_1=gen_random_uuid(), approved_at_1=now(),
    approved_by_id_2=gen_random_uuid(), approved_at_2=now()
where code='PO-DEMO-000001' and status='pending_approval';
