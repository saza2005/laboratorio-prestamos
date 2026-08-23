# FASE 4 — Auditoria de dependencias y dry-run condicionado

## 1. Entorno

- Proyecto: Supabase E2E (Project Ref enmascarado)
- Project Ref parcialmente oculto: rwni********wwim
- Rama: chore/e2e-supabase-baseline
- Node: disponible
- npm: npm ci y npm audit ejecutados
- Archivos de dependencias modificados: no

## 2. Auditoria completa

- Total: 10
- Bajas: 1
- Moderadas: 2
- Altas: 7
- Criticas: 0
- Dependencias directas afectadas: exceljs y next
- Dependencias transitivas afectadas: las restantes del CSV
- Fix disponible: reportado para los 10 paquetes
- Fix mayor requerido: exceljs propone un cambio mayor; los demas fixes reportados no requieren cambio mayor segun npm audit
- Detalle: fase-4-npm-audit-summary.csv

## 3. Auditoria de produccion

- Total: 8
- Bajas: 0
- Moderadas: 2
- Altas: 6
- Criticas: 0
- Diferencias frente al total: las vulnerabilidades de @babel/core y js-yaml no aparecen en el reporte --omit=dev; la ruta de produccion mantiene 8 vulnerabilidades reportadas

## 4. Ruta del script

- Dependencia directa: @supabase/supabase-js 2.101.1
- Dependencias transitivas relevantes: auth-js, functions-js, postgrest-js, realtime-js, storage-js y sus dependencias
- Vulnerabilidades en Supabase JS: ninguna vulnerabilidad directa; ws aparece en el arbol de realtime
- Vulnerabilidades alcanzables: ninguna identificada para auth.admin.listUsers(); Node 24 usa WebSocket nativo y ws no se carga en esa ruta
- Riesgo para credenciales: no identificado en la ruta del script
- Decision: continuar condicionado; los hallazgos fuera de esta ruta requieren remediacion separada

## 5. Dry-run

- Autorizado por condiciones: si, sin vulnerabilidades criticas ni vulnerabilidades alcanzables en listUsers
- Ejecutado: si, una vez
- Intentos: 1
- Codigo de salida: 1
- Usuarios antes: no determinado
- e2e_admin: no determinado
- e2e_lab_staff: no determinado
- e2e_teacher: no determinado
- e2e_student: no determinado
- Usuarios despues: no determinado
- Escrituras: 0
- Error: list_users_failed; no se repitio la consulta
- Salida: fase-4-create-users-dry-run-3.txt

## 6. Seguridad

- npm audit fix: no
- Dependencias modificadas: no
- Proyecto normal modificado: no
- Proyecto E2E remoto modificado: no
- Usuarios creados: no
- Perfiles creados: no
- Datos creados: no
- Archivo de estado: no creado
- Secretos: no mostrados
- Staging: no
- Commit: no

## 7. Conclusion

- Vulnerabilidades bloqueantes: no para la ruta aislada del script; existen 10 hallazgos generales que deben remediarse por separado
- Dry-run valido: no concluyente; la unica lectura autorizada fallo
- Conflictos de usuarios: no determinados
- Listo para creacion real: no
- Requiere autorizacion: diagnosticar la causa de list_users_failed y autorizar un nuevo intento de lectura; no usar --execute
- Accion recomendada: revisar conectividad/configuracion del proyecto E2E sin modificar dependencias y repetir solo tras nueva autorizacion
