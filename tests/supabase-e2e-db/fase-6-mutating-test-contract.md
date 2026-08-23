# FASE 6 — Contrato MUTATING

## Proyecto autorizado

Solo el proyecto Supabase E2E validado por `verify-baseline.mjs`. El proyecto normal no se consulta ni se referencia.

## Baseline protegido

Los datos A/B/C/D, sus hashes, los cuatro profiles, los cuatro usuarios Auth y los cuatro storageState canónicos son de solo lectura. No se usan como entidades mutantes.

## Namespace

Los escenarios futuros usarán identificadores inequívocos: `E2E_MUT_REQ_<scenario>`, `E2E_MUT_LOAN_<scenario>`, `E2E_MUT_RETURN_<scenario>`, `E2E_MUT_MAINT_<scenario>` y `E2E_MUT_ITEM_<scenario>`. El marcador deberá estar en un campo visible para cleanup y no contendrá secretos.

## Flujos y roles

R1/R4 usan teacher o student; R2/R3 y L1/L2/RET1/RET2/M1/I1 usan los roles operativos indicados en la matriz. Cada flujo tendrá un único rol actor y un único proyecto Playwright.

## RLS/RPC

Las Server Actions llaman RPC `security definer` con validación de `auth.uid()` y role. Las RPC y firmas están documentadas en `fase-6-mutating-entrypoints.csv`; ninguna se ejecuta en 6.1A.

## Cambios permitidos

Solo cambios de entidades con namespace MUTATING, dentro de un escenario y allowlist previamente autorizados. No se permite tocar baseline, perfiles, roles, Auth ni staging.

## State

Se propone `.e2e-state/mutating-tests.json`, ignorado por Git y con permisos 600, para IDs de escenarios únicamente. No contendrá contraseñas, tokens, cookies ni sesiones. No se crea en esta fase.

## Cleanup y rollback

El cleanup será un proceso separado, con `--confirm-e2e` y una confirmación mutante específica. Operará solo sobre IDs registrados. No usará `TRUNCATE` ni DELETE sin predicado inequívoco. Debe comprobar primero que no existen relaciones no autorizadas y que el escenario no apunta a baseline.

## Failure recovery

Si falla antes de escribir, se detiene y se verifica baseline. Si falla después de escribir, se conserva el registro de IDs, no se reintenta y se autoriza cleanup aislado. Si cleanup o baseline fallan, no se ejecuta otro flujo y se escala para inspección manual.

## StorageState y secretos

Los estados canónicos se consumen sin regenerarlos. El navegador no recibe service role. Los runners de mutación se separarán de READ_ONLY y AUTH_ONLY; ningún secreto se imprime ni se guarda en reportes.

## Artifacts

Video apagado. Screenshots y trace solo con autorización y sin inputs de credenciales. Artifacts ignorados y no publicados si contienen datos de negocio.

## Criterios PASS

Delta esperado confirmado, cleanup exacto, baseline posterior PASS, storageState 4/4 válido, namespace sin residuos y cero escrituras fuera de la allowlist.

## Criterios STOP

Target ambiguo, ID fuera de namespace, error de RLS/RPC, escritura parcial sin registro, cleanup fallido, baseline diferente, storageState inválido o cualquier referencia al proyecto normal.
