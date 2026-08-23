# Auditoria de selectores UI FLOW-R1

| Control | Label real | Accessible name | Selector anterior | Selector final | Clasificacion | Evidencia |
|---|---|---|---|---|---|---|
| Apertura | Ruta real | Nueva solicitud individual | navegacion directa | /solicitudes/nueva | STABLE | page route y Link de la pagina |
| Item bulk | texto de item y codigo | nombre del boton incluye codigo estable | button con Stock y first | getByRole('button', { name: /E2E_ITEM_BULK/ }) | STABLE | boton type=button y codigo renderizado |
| Purpose | Propósito sin asociacion htmlFor | no name accesible fiable | getByLabel('Propósito') | locator('input[name="purpose"]') | STABLE | input name y FormData.get('purpose') |
| Comments | Comentarios sin asociacion htmlFor | no name accesible fiable | no usado | locator('textarea[name="comments"]') | STABLE | textarea name y FormData.get('comments') |
| Fecha | Fecha estimada de devolución | no name accesible fiable | no usado | locator('input[name="scheduled_return_date"]') | STABLE | input name y FormData.get |
| Quantity | Cantidad sin asociacion htmlFor | no name accesible fiable | no usado | locator('input[type="number"]') despues de seleccionar un unico item | ACCEPTABLE | un solo control visible para la fila seleccionada |
| Submit | Enviar solicitud | nombre exacto | getByRole button exact | getByRole('button', { name: 'Enviar solicitud', exact: true }) | STABLE | button type=submit y texto exacto |

El selector anterior de purpose era BROKEN porque el label visible no esta asociado al input mediante htmlFor. El selector anterior del item era FRAGILE por depender del primer resultado; se sustituyo por el codigo estable del item del contrato. No quedan selectores FRAGILE o BROKEN en el flujo preparado.
