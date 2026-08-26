#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { appendFile, chmod, mkdir } from 'node:fs/promises'
import path from 'node:path'

const alertLog = process.env.OPERATIONAL_ALERT_LOG

if (!alertLog || !path.isAbsolute(alertLog)) {
  console.error('OPERATIONAL_ALERT_STATUS=FAIL (invalid_alert_log_path)')
  process.exit(1)
}

await mkdir(path.dirname(alertLog), { recursive: true, mode: 0o700 })
await appendFile(
  alertLog,
  `${new Date().toISOString()} Requiere revisión: falló una tarea operativa de laboratorio-prestamos.\n`,
  { encoding: 'utf8', mode: 0o600 }
)
await chmod(alertLog, 0o600)

const notification = process.env.OPERATIONAL_ALERT_DISABLE_DESKTOP === '1'
  ? { status: null }
  : spawnSync(
      'notify-send',
      [
        '--urgency=critical',
        'Laboratorio Préstamos',
        'Falló una tarea de respaldo o recuperación. Revise el registro operativo.',
      ],
      { encoding: 'utf8', stdio: 'ignore' }
    )

console.log('OPERATIONAL_ALERT_STATUS=RECORDED')
console.log(`DESKTOP_NOTIFICATION_SENT=${notification.status === 0 ? 'yes' : 'no'}`)
