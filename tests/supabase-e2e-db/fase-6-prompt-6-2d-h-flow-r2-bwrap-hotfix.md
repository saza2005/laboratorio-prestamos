# FASE 6 - Hotfix launcher FLOW-R2

## Diagnostico
El fallo `bwrap: loopback` ocurrio antes de iniciar Playwright y no procede de scripts del repositorio.

## Evidencia
El smoke READ_ONLY conocido y el smoke por el camino MUTATING iniciaron Next, Chromium y Playwright y navegaron autenticados correctamente.

## Hotfix
Se agrego una modalidad `--runtime-smoke` estrictamente allowlisted para probar el launcher sin seleccionar FLOW-R2 ni preparar state mutante.

## Integridad
Seed dry-run, cleanup dry-run, R1 pre, R1 dry-run, R2 dry-run, clean-state, baseline y storageState pasaron. Remote writes: 0.

## Seguridad
No se uso `--no-sandbox`, sudo, privilegios elevados ni cambios globales de bubblewrap.

## Conclusion
El launcher MUTATING runtime quedó validado mediante smoke READ_ONLY. No se ejecutó seed ni reject.
