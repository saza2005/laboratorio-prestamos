# FASE 3 — Comparación detallada local vs E2E

## 1. Archivos

- CSV locales: 13 inventarios, más fase-3-local-summary.csv
- CSV E2E: 13
- Válidos: 13/13 remotos
- Faltantes: ninguno
- Errores: ninguno
- Validación: fase-3-e2e-csv-validation.csv

## 2. Resumen de objetos

| Categoría | Local | E2E | Coinciden |
|---|---:|---:|---:|
| Tablas/columnas | 170 columnas | 170 columnas | 170 |
| PK | 18 | 18 | 18 |
| FK | 32 | 32 | 32 |
| UNIQUE | 6 | 6 | 6 |
| CHECK | 19 | 19 | 19 |
| Índices | 48 | 48 | 48 |
| Enums | 7 tipos / 33 valores | 7 tipos / 33 valores | sí |
| Funciones | 24 | 24 | 19 sin diferencias de seguridad; 5 con grant authenticated diferente |
| Dependencias | 27 | 27 | 27 |
| Triggers | 5 | 5 | 5 |
| RLS | 19/19 | 19/19 | sí |
| Policies | 45 | 45 | 45 |
| Permisos de tablas | 57 combinaciones | 57 combinaciones | diferencias conocidas |

## 3. Tablas y columnas

- Tablas: no se detectaron faltantes ni adicionales
- Columnas: 170/170 coinciden
- Diferencias: únicamente formato normalizado en booleanos, null y espacios
- Bloqueantes: ninguna diferencia estructural

## 4. Restricciones

- PK: 18/18 coinciden
- FK: 32/32 coinciden, incluyendo reglas de actualización, eliminación y deferrable
- UNIQUE: 6/6 coinciden
- CHECK: 19/19 coinciden
- Diferencias: formato y espacios normalizados, sin diferencias semánticas
- Bloqueantes: ninguna

## 5. Índices

- Local: 48
- E2E: 48
- Coincidentes: 48 por definición efectiva
- Diferencias reales: ninguna
- Diferencias de nombre/formato: ninguna relevante; se normalizaron definiciones y booleanos

## 6. Enums

- Tipos: 7 local y 7 E2E
- Valores: 33 local y 33 E2E
- Orden: coincidente por sort_order
- Diferencias: ninguna

## 7. Funciones

- Total: 24 local y 24 E2E
- Cuerpos coincidentes: 24 hashes normalizados coincidentes
- Firmas coincidentes: 24
- PUBLIC: 0 local y 0 E2E
- anon: 0 local y 0 E2E
- authenticated: 19 local y 24 E2E
- service_role: 24 local y 24 E2E
- SECURITY DEFINER: 19 en ambos
- Diferencias: cinco grants explícitos de authenticated presentes solo en E2E:
  - create_loan_transaction(uuid, uuid, integer, date, text, uuid)
  - create_loan_with_unit_transaction(uuid, uuid, uuid, integer, date, text, uuid)
  - deliver_approved_request(uuid, uuid, text)
  - deliver_approved_request_with_units(uuid, jsonb, uuid, text)
  - increment_stock(uuid, integer)
- Clasificación: SECURITY_DIFFERENCE; no hay exposición adicional a PUBLIC o anon

## 8. Triggers

- Total: 5 local y 5 E2E
- Coincidentes: sí
- Faltantes: ninguno
- Adicionales: ninguno
- Deshabilitados: ninguno
- Triggers: trg_item_units_updated_at, trg_items_updated_at, trg_loans_updated_at, trg_profiles_updated_at y trg_requests_updated_at

## 9. RLS y policies

- RLS: 19/19 en ambos
- Policies: 45/45
- Policies anon: 0
- Policies PUBLIC: 0
- Diferencias: ninguna lógica; solo formato booleano, null y espacios

## 10. Permisos de tablas

- Grants anon: existen diferencias documentadas, sin policies anon y con RLS habilitado
- Acceso efectivo anon: bloqueado por RLS y ausencia de policies anon
- Excepciones conocidas: loan_group_items, loan_groups y maintenance_records
- Staging: inventory_import_items_staging, inventory_import_units_staging e item_units_import_staging requieren decisión funcional
- Decisión pendiente: revisar si los grants SQL de staging deben conservarse o restringirse; no se modificaron

## 11. Clasificación

- EXACT_MATCH: objetos estructurales, enums, dependencias, triggers, RLS y policies
- FORMAT_ONLY: CRLF, booleanos t/f frente a true/false, null y espacios
- PLATFORM_METADATA: ninguno relevante detectado en esta comparación
- KNOWN_TABLE_GRANT_EXCEPTION: grants de tablas ya documentados
- SECURITY_DIFFERENCE: cinco grants authenticated en funciones legacy
- STRUCTURAL_DIFFERENCE: ninguna
- MISSING_OBJECT: ninguno
- ADDITIONAL_OBJECT: ninguno
- REQUIRES_MANUAL_DECISION: permisos de funciones legacy y tablas staging

## 12. Evaluación

- Esquema local y E2E equivalentes: sí estructuralmente; no equivalentes en permisos completos por cinco grants authenticated remotos
- Diferencias bloqueantes: sí para equivalencia de seguridad exacta; no hay exposición anon/PUBLIC ni diferencia estructural
- FASE 3.2 completada: no, queda la decisión sobre los cinco grants authenticated legacy
- Proyecto E2E listo para datos de prueba: no recomendado hasta decidir si esos grants deben conservarse o revocarse
- Problemas pendientes: confirmar el uso real de las cinco funciones y decidir la política de authenticated
- Siguiente paso: revisar esas funciones en el repositorio y preparar, solo si procede, una corrección de permisos con validación local y dry-run

## 13. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E modificado: no
- Operaciones remotas: ninguna
- SQL ejecutado: ninguno remotamente
- Permisos modificados: no
- Datos modificados: no
- Secretos: no mostrados
- Staging: no
- Commit: no
