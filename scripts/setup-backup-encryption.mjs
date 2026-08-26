#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const configurationDirectory = path.join(os.homedir(), '.config', 'laboratorio-prestamos')
const passphraseFile = path.join(configurationDirectory, 'backup-passphrase')

const first = askValidPassphrase()
const confirmation = ask('Repita exactamente la contraseña (confirmación)')
if (confirmation === null) cancel()
if (first !== confirmation) {
  showError('Las contraseñas no coinciden. Ejecute nuevamente la configuración.')
  fail('Las contraseñas no coinciden.')
}

await mkdir(configurationDirectory, { recursive: true, mode: 0o700 })
await chmod(configurationDirectory, 0o700)
await writeFile(passphraseFile, first, { mode: 0o600 })
await chmod(passphraseFile, 0o600)

console.log('BACKUP_ENCRYPTION_SETUP=PASS')
console.log('PASSPHRASE_FILE_MODE=600')
console.log('RECOVERY_PASSWORD_EXTERNAL_COPY_REQUIRED=yes')

function ask(text) {
  const result = spawnSync(
    'zenity',
    ['--password', `--title=${text}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  )

  if (result.status !== 0) return null
  return result.stdout.replace(/[\r\n]+$/, '')
}

function askValidPassphrase() {
  while (true) {
    const passphrase = ask('Contraseña del respaldo — mínimo 20 caracteres')
    if (passphrase === null) cancel()
    if (passphrase.length >= 20) return passphrase
    showError(`La contraseña ingresada tiene ${passphrase.length} caracteres; se requieren al menos 20.`)
  }
}

function showError(text) {
  spawnSync(
    'zenity',
    ['--error', '--title=Contraseña no válida', `--text=${text}`],
    { encoding: 'utf8', stdio: 'ignore' }
  )
}

function cancel() {
  console.log('BACKUP_ENCRYPTION_SETUP=CANCELLED')
  process.exit(1)
}

function fail(message) {
  console.error(`BACKUP_ENCRYPTION_SETUP=FAIL (${message})`)
  process.exit(1)
}
