# FASE 2 — Comparación de permisos RPC

## Resultado

- Comparación realizada entre el snapshot previo y el snapshot posterior al reset local.
- Funciones comparadas: 24 en el snapshot completo; 3 funciones objetivo en detalle.
- Único cambio: `anon` pasó de `true` a `false` en las tres RPC mutacionales objetivo.
- `PUBLIC`: permaneció sin permiso efectivo en las tres funciones.
- `authenticated`: permaneció con permiso efectivo en las tres funciones.
- `service_role`: permaneció con permiso efectivo en las tres funciones.
- Otras funciones modificadas: ninguna.
- Grants de tablas o secuencias modificados: ninguno detectado.
- Policies, RLS y triggers modificados: ninguno.

## Funciones objetivo

| Función | anon antes | anon después | PUBLIC antes | PUBLIC después | authenticated | service_role |
|---|---:|---:|---:|---:|---:|---:|
| `public.register_full_return_transaction(uuid, text, uuid)` | true | false | false | false | true | true |
| `public.register_maintenance_record_transaction(uuid, uuid, text, text, date, text, text, boolean)` | true | false | false | false | true | true |
| `public.update_item_unit_status_transaction(uuid, text, text)` | true | false | false | false | true | true |

## Conclusión

La comparación confirma que el hardening local está limitado a retirar `EXECUTE` de `anon` para las tres funciones indicadas. No se observaron regresiones de permisos en otras funciones ni cambios fuera del alcance de la migración.
