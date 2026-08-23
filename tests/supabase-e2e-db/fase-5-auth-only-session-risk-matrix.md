# Matriz de riesgo de sesiones AUTH_ONLY

| Test | Sesión inicial | Efecto Auth | Estado canónico | Riesgo | Clasificación | Estrategia |
|---|---|---|---|---|---|---|
| ROLE-01 | No debe usar el estado canónico | Login adicional; posible last_sign_in_at | FILE_UNCHANGED; SESSION_STILL_VALID esperado | Medio | Bloqueado | Contexto efímero |
| ROLE-02 | No debe usar el estado canónico | Login adicional; posible last_sign_in_at | FILE_UNCHANGED; SESSION_STILL_VALID esperado | Medio | Bloqueado | Contexto efímero |
| SETUP-01 | Contexto vacío por rol | Login y escritura de storageState | Riesgo de sobrescritura/invalidez | Alto | Bloqueado | No ejecutar |
| Logout futuro | Contexto efímero | scope local; limpieza local | FILE_UNCHANGED; SESSION_STILL_VALID esperado | Bajo | Pendiente | Opción A |

El hash intacto solo demuestra que el archivo no cambió; no demuestra que una sesión remota siga aceptada.
