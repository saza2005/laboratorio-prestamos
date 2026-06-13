-- PASO 1: crear tablas temporales persistentes para cargar los CSV.
-- Este script no elimina ni modifica el inventario actual.

create table if not exists public.inventory_import_items_staging (
  code text primary key,
  name text not null,
  description text,
  category text not null,
  item_type text not null,
  track_individual boolean not null,
  stock_total integer not null,
  stock_available integer not null,
  status text not null,
  location text
);

create table if not exists public.inventory_import_units_staging (
  item_code text not null,
  asset_code text primary key,
  old_code text,
  serial_code text not null unique,
  model text,
  brand text,
  entry_date text,
  assignment_date text,
  condition text not null,
  availability_status text not null,
  notes text
);

truncate table
  public.inventory_import_units_staging,
  public.inventory_import_items_staging;

alter table public.inventory_import_items_staging enable row level security;
alter table public.inventory_import_units_staging enable row level security;

revoke all on public.inventory_import_items_staging from anon, authenticated;
revoke all on public.inventory_import_units_staging from anon, authenticated;

comment on table public.inventory_import_items_staging is
  'Carga temporal del inventario oficial 2026-06-09. Eliminar tras finalizar la importación.';
comment on table public.inventory_import_units_staging is
  'Carga temporal de unidades oficiales 2026-06-09. Eliminar tras finalizar la importación.';
