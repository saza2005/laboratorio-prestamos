# Plan de ejecución futura AUTH_ONLY

No ejecutar en FASE 5.4A.

1. G: no hay definiciones AUTH_ONLY separadas de guards en el inventario.
2. LF: no hay LOGIN_FAILURE AUTH_ONLY en el inventario.
3. LS: ROLE-01/ROLE-02 solo con contexto efímero y selectores corregidos.
4. SP: SETUP-01 bloqueado porque los cuatro estados canónicos ya existen.
5. LO: no existe test AUTH_ONLY de logout; cualquier futuro logout debe usar sesión efímera y scope local.

Condiciones: baseline PASS, storageState PASS, retries=0, detener ante primer error y postflight de integridad.
