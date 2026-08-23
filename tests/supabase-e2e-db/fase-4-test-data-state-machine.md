# Máquina de estados E2E: lotes A-C

- request: pending -> approved/rejected; approved -> delivered mediante entrega RPC.
- loan: active -> partial_return mediante devolución parcial; active/partial_return -> returned mediante devolución completa.
- C1: approved -> delivered y loan active; no devolución.
- C2: loan active cantidad 2 -> partial_return tras devolver 1.
- C3: loan active cantidad 1 -> returned tras devolución completa.
- Stock bulk: C1 baja en 1; C2 baja en 2 y restaura 1; C3 baja en 1 y restaura 1. Las transiciones reales se ejecutarán solo en la autorización futura.
- Movimientos: derivados por RPC, nunca insertados manualmente.


## Lote D

- Unit condition: good -> maintenance.
- Unit availability: available -> unavailable.
- register_maintenance_record_transaction with p_mark_unit_unavailable=true calls update_item_unit_status_transaction internally.
- D1 creates one maintenance record and one derived adjustment_down movement; tracked stock 2 -> 1.
- E2E_ITEM_TRACKED-002 remains good/available.
- No maintenance close transition is executed in D1.