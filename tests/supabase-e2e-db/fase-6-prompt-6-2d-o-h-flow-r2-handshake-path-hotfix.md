# FASE 6 - Hotfix handshake browser-first

## 1. Fallo heredado
El smoke anterior fallo escribiendo /.json despues de navegacion autenticada.

## 2. Root cause
El signalPath estaba mal construido; el run id y el directorio del padre eran validos.

## 3. Parent-child contract
El padre propaga solo runtime directory y run identity. El child no recibe secretos ni fixture.

## 4. Path correction
El path usa runtimeDir/runId.json, con identidad validada y escritura atomica.

## 5. Guards
Se rechazan identidades stale y estados invalidos; no se desactiva sandbox.

## 6. Local tests
TypeScript, ESLint, node check, path tests y roundtrip local pasaron.

## 7. Runtime validation
El smoke paso: Playwright, Chromium, navegacion, BROWSER_READY, CANCEL y browser exit.

## 8. Integridad
Remote writes 0, RPC 0, fixture 0, baseline PASS, storageState MATCH y clean-state PASS.

## 9. Seguridad
No se uso no-sandbox, sudo ni cambios de bubblewrap.

## 10. Conclusion
El handshake browser-first queda validado para futuras ejecuciones post-BROWSER_READY.
