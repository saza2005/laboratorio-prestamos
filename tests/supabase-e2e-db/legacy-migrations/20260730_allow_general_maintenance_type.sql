alter table public.maintenance_records
  drop constraint if exists maintenance_records_maintenance_type_check;

alter table public.maintenance_records
  add constraint maintenance_records_maintenance_type_check
  check (maintenance_type = any (array['preventive'::text, 'corrective'::text, 'general'::text]));
