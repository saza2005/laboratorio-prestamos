# Contrato de C1: entrega de solicitud aprobada

- Firma activa: public.deliver_approved_request_with_units(uuid, jsonb, jsonb, uuid, text)
- Parámetros, en orden: p_request_id uuid; p_units jsonb; p_items jsonb; p_delivered_by uuid; p_notes text.
- Retorno: uuid.
- Seguridad: SECURITY DEFINER, owner postgres, search_path public, pg_temp.
- Actor: authenticated con perfil admin o lab_staff; p_delivered_by debe ser auth.uid().
- Precondiciones: solicitud existente y approved; item activo; cantidad aprobada pendiente; stock suficiente; JSON arrays válidos; unidades solo para items tracked.
- C1 bulk: p_units=[] y p_items=[{request_item_id, item_id, quantity}]. No se asigna item_unit.
- Efectos: loans, loan_items, request status delivered, request_items quantity_delivered, items stock e inventory_movements.
- Cuerpo y excepciones revisados desde la migración baseline local; el cuerpo no se ejecutó durante el diagnóstico.
