# FLOW-R2 - Browser-first orchestration

## Motivation
Las ejecuciones de reject crearon el fixture antes de descubrir fallos del launcher. El diseño browser-first evita cualquier write antes de una pagina autenticada lista.

## Current failure mode
El launcher puede fallar por `bwrap` antes de Playwright. El smoke de esta fase inicio Playwright, Chromium y navegacion, pero fallo publicando la señal por un defecto local del test.

## Process architecture
Un coordinador separado crea un run id, inicia el browser child, espera `BROWSER_READY`, envia `CANCEL` y espera salida.

## Privilege separation
El browser recibe solo entorno minimo de Playwright y handshake. No recibe credenciales administrativas ni confirmaciones mutantes.

## Handshake
Estado versionado, identidad `RUNTIME_` aleatoria, JSON atomico y directorio local 0700.

## Browser readiness
`BROWSER_READY` se publica despues de navegar a `/dashboard/solicitudes` y comprobar el control autenticado.

## Seed handoff
Futuro: solo despues de readiness; no se ejecuto en esta fase.

## Fixture handoff
Futuro: el browser existente leeria state validado despues de `FIXTURE_READY`; no se lanza un segundo browser.

## Reject handoff
Futuro: helper pre-action y confirm fuera del helper; no se ejecuto.

## Failure matrix
Fallo antes de readiness: writes 0 y ABORT. Fallos posteriores requieren tracking y cleanup exacto, sin retry automatico.

## Cleanup
No aplica en esta fase; no hubo fixture.

## Security
No se uso `--no-sandbox`, sudo ni cambios de bubblewrap. No hubo RPC ni writes.

## Runtime validation
El smoke fue seleccionado como 1 test y el camino readonly conocido funciona. La unica ejecucion del orchestrator inicio Playwright/Chromium y navegacion, pero no completo el handshake por `signalPath` mal formado (`/.json`).

## Conclusion
La arquitectura esta implementada, pero el handshake runtime no queda validado definitivamente hasta corregir el defecto local y obtener una nueva autorizacion.

## Handshake path failure
El primer smoke intento escribir /.json porque el test no componia el path con las variables recibidas.

## Root cause
La causa fue un PATH_JOIN_BUG local; el padre genero y propago un run id valido.

## Path guards
El protocolo valida identidad, estados permitidos, escritura atomica y directorio runtime controlado.

## Runtime roundtrip validation
Tras el hotfix, el smoke paso BROWSER_READY, CANCEL, CLEAN y salida del browser con writes cero.

## Post-ready handoff
El coordinador soporta HANDOFF_DRY_RUN y espera ACTION_ARMED_DRY_RUN en el mismo run/browser antes de CANCEL.

## FIXTURE_READY gate
La rama real exige state R2 activo, request_id, seed confirmado y cleanup requerido; esta fase solo prueba dry-run.

## ACTION_ARMED barrier
El browser publica el ACK solo despues de conservar pathname y autenticacion.

## Same-browser continuity
No se lanza un segundo Playwright ni Chromium despues de BROWSER_READY.

## Runtime handoff validation
El smoke post-ready paso con writes 0, misma sesion, CANCEL y salida limpia.

## Tracking field mismatch
La rama browser-first introdujo una referencia local no perteneciente al schema: `seed_write_confirmed`. El state canónico compartido por R1/R2 persiste exclusivamente `remote_write_confirmed`. El cambio de esta fase elimina la divergencia sin renombrar el schema ni añadir fallback.

## Canonical seeded-state gate
El gate compartido exige, en orden lógico, active_flow=FLOW-R2, namespace R2, request_id presente, `remote_write_confirmed=true`, cleanup_required=true y correlation marker válido. Solo después se permite el camino de fixture exacto, pending, helper pre-action y localización del confirm antes de ACTION_ARMED.

## Canonical runtime handshake states
El contrato runtime canónico se centralizó en runtime-handshake.mjs. Incluye los estados usados por smoke y flujo real: IDLE, BROWSER_STARTING, BROWSER_READY, HANDOFF_DRY_RUN, ACTION_ARMED_DRY_RUN, FIXTURE_WAIT, FIXTURE_READY, ACTION_ARMED, ACTION_GO, ACTION_RUNNING, ACTION_DONE, CANCEL, ABORT y CLEAN.

## ACTION_ARMED contract
ACTION_ARMED es publicado por el browser únicamente después del gate canónico R2, la localización exacta de la request pending, el helper pre-action y la localización del confirm. El parent lo valida con la misma definición y solo permite la transición posterior ACTION_GO.

## ACTION_DONE contract
En el flujo real el browser publica ACTION_DONE después del único click; el parent lo consume y publica CANCEL. ACTION_RUNNING permanece definido para compatibilidad del protocolo, pero no es utilizado por esta implementación.

## Transition graph
Las transiciones se validan explícitamente: BROWSER_STARTING -> BROWSER_READY/ABORT; BROWSER_READY -> FIXTURE_READY o HANDOFF_DRY_RUN/ABORT; FIXTURE_READY -> ACTION_ARMED/ABORT; ACTION_ARMED -> ACTION_GO/ACTION_RUNNING/ACTION_DONE/CANCEL/ABORT; ACTION_GO -> ACTION_DONE/CANCEL/ABORT; ACTION_DONE -> CANCEL/CLEAN; CANCEL y ABORT -> CLEAN.

## State drift protection
Parent y browser importan el mismo conjunto y validador de transiciones. Los estados desconocidos, stale, duplicados y saltos prematuros son rechazados por tests locales.

## Reject click-to-Server-Action boundary
El control visible Rechazar pertenece a un form y es el submit inicial. useConfirmSubmit intercepta ese submit, hace preventDefault y abre un dialog; el botón Rechazar del dialog es el control que ejecuta requestSubmit().

## Server Action submission semantics
El camino correcto es submit inicial -> dialog confirm -> POST con header de Server Action -> response. El helper futuro usa el request_id y rejection_reason del form y espera request y response POST sin registrar bodies ni headers sensibles.

## ACTION_DONE completion semantics
ACTION_DONE ya no debe significar únicamente que locator.click() retornó. El camino corregido espera el request POST de Server Action, su response y la postcondición de navegación antes de publicar ACTION_DONE.

## Post-action lifecycle
El parent debe clasificar DB por request_id después de ACTION_DONE y mantener el proceso disponible hasta esa clasificación. Esta fase no ejecuta el flujo mutante; el diagnóstico runtime fue bloqueado por redirección a login antes del control.

## H5-R2 two-step runtime evidence
El diagnostico READ_ONLY usa el admin state canonico, un solo browser, `--no-deps` y retries 0. Instala antes de navegar un route kill-switch que deja pasar GET y aborta todo POST, contando intentos y bloqueos por separado. El submit inicial se identifica dentro de `dialog[name="Detalle"]`; el confirm final permanece scoped exclusivamente a `dialog[name="Rechazar solicitud"]` y no usa locator global ni `first/last/nth`.

El runtime adicional probo Detail count 1, baseline pending visible, initial submit count 1, dialog pre-click 0, initial click 1 y POST after initial click 0. El dialog se abrio, pero una comprobacion de identidad pidio el handle a un locator inicial vivo despues de que el dialog anidado agregara otro boton `Rechazar` dentro del form. La ejecucion termino antes del confirm real, con POST 0 y sin ACTION_DONE. La instrumentacion se corrigio estaticamente capturando el handle inicial antes del click y usando `button[type="submit"]`; no se reejecuto.

La barrera de completion sigue exigiendo POST attempted + intercepted/blocked antes de cualquier ACTION_DONE y clasificacion DB posterior. La evidencia runtime completa de esa barrera queda pendiente; postflight quedo CLEAN y sin writes.

## H5-R2 scoped confirm runtime result
La siguiente y unica continuacion demostro directamente en el contexto DOM que el submit inicial y el confirm del dialog son nodos distintos. Se hizo un solo click sobre el confirm scoped y el kill-switch permanecio activo. El navegador genero 2 intentos POST, ambos abortados antes de Next; al no ser el conteo exacto esperado, la barrera detuvo el test antes de declarar completion y no publico ACTION_DONE.

La clasificacion DB se ejecuto inmediatamente despues del proceso browser y confirmo cero RPC, updates o writes y baseline pending. El lifecycle click -> exactly one POST no queda validado; no hubo retry, segundo Playwright ni segundo browser.

## Safe POST classification
El clasificador por identidad de Request demostro que los dos conteos no eran duplicacion instrumental. El primer POST fue el unico Server Action candidate a la ruta de solicitudes y fue abortado. El segundo fue una llamada separada a `/__nextjs_original-stack-frames`, sin Next-Action, emitida por el tooling de error de Next en desarrollo despues del `Failed to fetch` causado por el kill-switch.

Por tanto, el click real produjo un submit de aplicacion y el entorno de desarrollo produjo un POST diagnostico adicional. El resultado es `UNRELATED_SECOND_PAGE_POST`, no `APPLICATION_DOUBLE_SUBMIT`. La barrera no publico ACTION_DONE; la clasificacion DB posterior permanecio limpia. El contrato exact-one-total-POST no se redefine y H5-R2 permanece abierta.

## Refined Server Action boundary
La observabilidad final distingue trafico POST total de intentos Server Action sin relajar el kill-switch. `SERVER_ACTION_CANDIDATE` exige POST same-origin y presencia de Next-Action. `FRAMEWORK_DIAGNOSTIC` exige exactamente `/__nextjs_original-stack-frames`, ausencia de Next-Action y la metadata fetch/text observada. Cualquier otro POST queda unknown/unexpected y hace fail closed. Independientemente de clase, todo POST se aborta.

El runtime final demostro initial click -> Server Action POST 0; real dialog confirm -> Server Action POST 1 bloqueado. El POST diagnostico framework tambien fue bloqueado. No hubo POST inesperado, ACTION_DONE prematuro ni acceso a Next. La clasificacion DB ocurrio despues de los bloqueos y permanecio limpia. H5-R2 queda CLOSED; esta fase no inicia FLOW-R2 real.

## First REAL FLOW-R2 attempt after H5-R2
El parent publico BROWSER_READY y solo entonces ejecuto el seed unico. Seed tracking, seeded verifier y FIXTURE_READY pasaron. El browser fallo preparando el form exacto porque el helper uso un `has` compuesto desde el dialog dentro del scope del form, lo que no podia resolver el textarea descendiente. El fallo ocurrio antes de ACTION_ARMED, ACTION_GO y cualquier reject click.

El parent no reintento y, tras el timeout de ACTION_ARMED, ejecuto exactamente un cleanup R2 sobre los dos targets trackeados. Post-cleanup y postflight restauraron CLEAN sin residuos. El helper se corrigio localmente despues, sin nueva ejecucion. Browser-first conserva un Playwright y un Chromium; el intento real queda FAIL antes del business action.

## Forensic classification of REAL attempt #1
Screenshot y DOM snapshot del fallo demuestran que el fixture real pending si renderizo Detail, RejectForm, textarea y submit `Rechazar`. El gate JSX dependia de acceso canManageLoans, seleccion de la request y status pending; todos pasaron. El seed satisfizo todos los gates y no difirio de la referencia H5-R2 en ninguna condicion relevante al render.

El helper real compuso `has` con un locator que comenzaba nuevamente en Detail. Como Playwright resuelve `has` relativamente al form candidato, esa composicion no podia encontrar el textarea aunque estaba presente. H5-R2 usaba el textarea de pagina como inner locator y no tenia esa regresion. Root cause: `LOCATOR_REGRESSION`, no fixture/render/timing. REAL ATTEMPT #1 conserva: seed exitoso, fixture pending, Detail encontrada, Reject control presente en DOM pero no resuelto por el helper, reject NOT_ATTEMPTED, cleanup exitoso y baseline restaurado.

## H6-R2 validation through the real helper path
El test diagnostico READ_ONLY ahora importa y ejecuta `prepareFlowR2RejectAction`, igual que `request-reject.browser-armed.spec.ts`. El helper usa la semantica H5-R2 corregida y una prueba local evita la variante defectuosa y workarounds posicionales.

La ejecucion unica con admin canonico recorrio el helper sobre una baseline pending, alcanzo el submit inicial, abrio el dialog y localizo el confirm real scoped. El kill-switch instalado antes de que el helper navegara bloqueo el Server Action y el POST diagnostico framework. No hubo seed, reject remoto, cleanup, RPC ni write. Completion/lifecycle y clasificacion DB pasaron; postflight quedo CLEAN. H6-R2 PASS no autoriza ni inicia REAL attempt #2.

## REAL ATTEMPT #2 lifecycle
El flujo real uso el mismo browser desde BROWSER_READY hasta el confirm. Seed, seeded verifier, fixture gate, helper, ACTION_ARMED y ACTION_GO pasaron. El kill-switch READ_ONLY no estaba activo. El submit inicial abrio el dialog y el confirm real scoped produjo un Server Action request unico observado y completado.

La DB alcanzo rejected y el verifier delta paso antes del cleanup, pero la rama browser fallo al exigir response HTTP `ok`; la respuesta no-2xx coexistio con una operacion persistida. Como el browser no publico ACTION_RUNNING, el parent no llego a su clasificacion integrada ni publico ACTION_DONE. La clasificacion exacta se ejecuto externamente de inmediato mientras el fixture seguia trackeado, antes del cleanup.

No hubo retry. El cleanup exacto unico y postflight restauraron baseline/CLEAN. Resultado: Playwright FAIL, business DB PASS, mutation despite Playwright failure yes y FLOW-R2 OPEN. La evidencia confirma nuevamente que response/browser PASS no sustituye clasificacion DB.

## H7-R2 completion barrier correction
La forense ubico el primer fallo exactamente despues de `SERVER_ACTION_COMPLETION_OBSERVED` y antes de `ACTION_RUNNING`: el browser exigia `response.ok() === true`. Ese predicado mezclaba la clase HTTP con completion y era incompatible con el comportamiento exitoso real del action, que persiste y luego redirige. El correo fallido queda capturado como side effect no fatal. No existe evidencia de excepcion cliente, error boundary, fallo de persistencia ni error post-action de negocio; UI y DB mostraron rejected.

El contrato corregido mantiene dos fases. Browser completion requiere un click retornado, un request correlacionado, una response observada, exactamente un Server Action y cero POST inesperados. ACTION_DONE requiere ademas DB classification started/completed, business write confirmado y publicacion previa cero. Click o response por si solos siguen sin alcanzar ACTION_DONE.

El clasificador POST se extrajo a una funcion local compartida: Server Action exige evidencia positiva de Next-Action; framework diagnostic conserva la coincidencia exacta `/__nextjs_original-stack-frames` con su metadata; cualquier otro POST falla cerrado. Todos los contadores se reportan antes del gate de browser completion. No se hizo runtime remoto en H7-R2. Las pruebas locales de completion, lifecycle, ACTION_DONE, handshake, tracking y request classification pasan; el siguiente paso seguro es una validacion READ_ONLY del real-runner corregido, sin seed ni mutacion business.

## H8-R2 synthetic redirect safety gate
El runtime READ_ONLY propuesto exigia responder al Server Action interceptado con semantica HTTP equivalente al redirect real del attempt #2. Los artifacts preservados solo contienen el fallo booleano de `response.ok()`, la completion observada y el snapshot posterior Rechazada. No contienen status, Location ni redirect chain. Inferirlos desde el codigo o desde el DOM violaria el requisito de no inventar la respuesta.

La fase se detuvo antes de Playwright con `SYNTHETIC_REDIRECT_REPLAY_SAFE: no`. No hubo POST, seed, cleanup, RPC ni write. Las pruebas locales del harness, incluida non-ok redirect completion y los casos fail-closed, pasan; baseline, storageState y clean-state permanecen PASS/CLEAN. H8 no valida aun la orquestacion en navegador y FLOW-R2 sigue OPEN.

## H8A-R2 local Next redirect semantics
Next 16.2.2 implementa `redirect()` como control-flow. Para una fetch Server Action el action handler captura la señal, establece 303 y comunica el destino mediante metadata interna, sin Location. Los redirects internos intentan transmitir Flight/RSC del destino; esta dependencia impide fabricar un replay fiel a partir de los artifacts incompletos del attempt #2. La respuesta non-ok observada es compatible con el success path real, pero su status exacto no fue registrado.

## H8B-R2 shared lifecycle coordinator
El lifecycle real ya no depende de bloques imposibles de ejercitar juntos. Un modulo compartido expone la fase browser `publishActionRunningAfterCompletion`, la fase parent `coordinateDbClassificationAfterActionRunning` y su composicion `runRejectLifecycleCoordinator`. El spec y el orchestrator reales importan esas mismas funciones; H8B no contiene una implementacion paralela.

El adapter H8B es local y devuelve `NO_MUTATION_EXPECTED`. El orden observado fue click returned, request seen, completion observed, ACTION_RUNNING, DB started, DB completed y terminal READ_ONLY. ACTION_DONE permanecio en cero. El caso local business-confirmed valida separadamente que ACTION_DONE se publica exactamente una vez despues de DB. Los casos incompletos o ambiguos fallan cerrados y los contadores se reportan aun con response.ok false.

H8B no ejecuto navegador ni acceso mutante. La correccion de orquestacion queda validada por el mismo coordinador usado en produccion E2E, mientras el resultado historico del attempt #2 conserva Playwright FAIL y business PASS.
