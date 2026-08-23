# FASE 5 — Auditoría AUTH_ONLY

## 1. Estado inicial
Baseline PASS. StorageState PASS. Los cuatro archivos canónicos permanecen sin cambios.

## 2. Inventario AUTH_ONLY
Se identificaron 3 definiciones: ROLE-01, ROLE-02 y SETUP-01. LOGIN_SUCCESS=2 y SESSION_PERSISTENCE=1. No existen LOGIN_FAILURE ni LOGOUT AUTH_ONLY.

## 3. Login
ROLE-01 y ROLE-02 realizan login email/password dentro del test y navegan rutas administrativas. Requieren credenciales del runner, pueden actualizar last_sign_in_at y no deben usar estados canónicos. SETUP-01 crea estados y rechaza sobrescrituras; permanece bloqueado.

## 4. Logout
La aplicación implementa signOut scope local en app/dashboard/actions.ts, limpia cookies y redirige a /auth/login. No existe test AUTH_ONLY de logout.

## 5. Semántica signOut
@supabase/supabase-js y @supabase/auth-js: 2.101.1. Soporta global/local/others y default global. La aplicación usa local explícitamente; futuros tests deben usar sesión efímera.

## 6. Riesgo de sesiones
SETUP-01: alto. ROLE-01/02: medio si parten de estados canónicos. No se ejecutó ninguno.

## 7. Selectores
Login ROLE-01/02: FRAGILE, botón Entrar sin exact=true. Setup: STABLE, labels y botón exacto. Logout real: STABLE; no existe selector AUTH_ONLY auditado.

## 8. Artifacts
Los tests de login podrían capturar entradas sensibles. Futuro runner: video off, screenshot deshabilitado y trace solo con diagnóstico sanitizado.

## 9. Arquitectura
G/LF no existen; LS requiere contexto efímero y runner AUTH_ONLY separado; SP bloqueado; LO futuro con opción A, sesión efímera.

## 10. Contrato
Ver fase-5-auth-only-execution-contract.md. No se autoriza ejecución en esta fase.

## 11. Plan
Ver fase-5-auth-only-execution-plan.md.

## 12. Integridad
AUTH_ONLY=0, logins=0, logout=0. StorageState posterior PASS, hashes 4/4 y baseline posterior PASS. Escrituras public=0.

## 13. Conclusión
FASE 5.4A completada. AUTH_ONLY auditados y planificados, no ejecutados. Requiere autorización separada y runner efímero.
