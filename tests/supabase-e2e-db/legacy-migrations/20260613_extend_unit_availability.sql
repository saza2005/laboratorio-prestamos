-- Añade los estados utilizados para el seguimiento de unidades prestadas.
-- No modifica ni elimina los valores o registros existentes.

alter type public.unit_availability
  add value if not exists 'loaned';

alter type public.unit_availability
  add value if not exists 'unavailable';

-- Verificación: debe incluir available, loaned y unavailable.
select enumlabel
from pg_enum
where enumtypid = 'public.unit_availability'::regtype
order by enumsortorder;
