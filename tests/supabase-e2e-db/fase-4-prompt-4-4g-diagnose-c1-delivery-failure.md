# FASE 4 — Diagnóstico del fallo de entrega C1

## 1. Estado
- Proyecto: Supabase E2E (rwni********wwim)
- Estado remoto intacto: sí
- Reintento de escritura: no
- Error original recuperable: no; el script solo conservó loan_delivery_failed_E2E_LOAN_ACTIVE

## 2. Función
- Firma: public.deliver_approved_request_with_units(uuid,jsonb,jsonb,uuid,text)
- Parámetros: p_request_id, p_units, p_items, p_delivered_by, p_notes
- Retorno: uuid
- Seguridad: SECURITY DEFINER; search_path public, pg_temp
- Precondiciones: actor lab_staff/admin autenticado y p_delivered_by igual a auth.uid(); request approved; item activo; cantidad aprobada y stock válidos.
- Excepciones relevantes: No autenticado; permisos; solicitud no encontrada/no approved; cantidad inválida; stock insuficiente; unidad inválida/no disponible.

## 3. Solicitud C1
- Status: approved
- Item: E2E_ITEM_BULK
- Tipo: consumable bulk
- Cantidad: solicitada 1, aprobada 1, entregada 0
- Aprobación: registrada por lab_staff activo
- Entrega previa: no
- Préstamo previo: no
- Discrepancias: ninguna en datos ni payload

## 4. Aplicación vs script
- JSON items: coincidente, con request_item_id, item_id y quantity 1
- JSON units: [] coincidente para bulk
- UUID de request/item: coincidentes
- Notes: coincidente semánticamente
- Control de éxito: retorno UUID, correcto
- Diferencia: el script autenticaba e2e_teacher cuando solicitaba e2e_lab_staff; p_delivered_by era el UUID de lab_staff.

## 5. Causa
- Origen: Postgres, durante la validación de la RPC
- Categoría: permission_denied/business_precondition_failed
- Evidencia: la función exige p_delivered_by = auth.uid(); el cliente anterior no correspondía al UUID enviado.
- Código Postgres/PostgREST: no recuperable; fue sustituido por el error genérico del script
- Hint: no recuperable
- Causa raíz confirmada: sí
- Hipótesis descartadas: item tracked, JSON incorrecto, estado request, stock y tipo de retorno.

## 6. Corrección local
- Script modificado: sí, mapeo explícito e2e_lab_staff -> sus credenciales
- Payload modificado: no
- Manejo de errores mejorado: sí, clasificación sanitizada por operación/alias/categoría/etapa
- Datos remotos modificados: no
- Migración requerida: no
- Riesgo: el execute no se repitió; requiere nueva autorización.

## 7. Dry-run
- Ejecutado después de la corrección: sí, una vez
- Código: 0
- C1: WOULD_CREATE
- C2: WOULD_CREATE_AND_RETURN_PARTIAL
- C3: WOULD_CREATE_AND_RETURN_FULL
- Precondiciones locales/lectura: satisfechas
- Escrituras: 0
- Estado remoto posterior: intacto; loans/returns/movements 0, request C1 approved, stock 10/10.

## 8. Conclusión
- Causa identificada: sí
- Corrección validada: sí mediante sintaxis y dry-run
- Listo para reintentar C1: sí, solo con nueva autorización explícita de execute
- Problemas pendientes: no se recuperó el mensaje original de Postgres
- Acción recomendada: autorizar un nuevo intento controlado; no ejecutar C2/C3 hasta confirmar C1.
