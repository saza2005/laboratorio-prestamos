#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const externalRoot = process.env.EXTERNAL_BACKUP_DIR
const passphraseFile = process.env.BACKUP_PASSPHRASE_FILE
const maximumAgeDays = Number(process.env.BACKUP_MAX_AGE_DAYS ?? 35)

if (!externalRoot || !path.isAbsolute(externalRoot)) {
  fail('EXTERNAL_BACKUP_DIR debe ser una ruta absoluta.')
}
if (!passphraseFile || !path.isAbsolute(passphraseFile)) {
  fail('BACKUP_PASSPHRASE_FILE debe ser una ruta absoluta.')
}
if (!Number.isFinite(maximumAgeDays) || maximumAgeDays <= 0) {
  fail('BACKUP_MAX_AGE_DAYS debe ser un número positivo.')
}

try {
  const entries = await readdir(externalRoot, { withFileTypes: true })
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.tar.gpg'))
      .map(async (entry) => {
        const file = path.join(externalRoot, entry.name)
        return { file, metadata: await stat(file) }
      })
  )

  candidates.sort((left, right) => right.metadata.mtimeMs - left.metadata.mtimeMs)
  const latest = candidates[0]
  if (!latest) throw new Error('encrypted_backup_not_found')

  const ageDays = (Date.now() - latest.metadata.mtimeMs) / 86_400_000
  if (ageDays > maximumAgeDays) throw new Error('encrypted_backup_too_old')

  const verification = spawnSync(
    process.execPath,
    [path.join(import.meta.dirname, 'verify-encrypted-backup.mjs'), latest.file],
    {
      encoding: 'utf8',
      env: { ...process.env, BACKUP_PASSPHRASE_FILE: passphraseFile },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )
  if (verification.status !== 0) throw new Error('encrypted_backup_recovery_check_failed')

  console.log('LATEST_ENCRYPTED_BACKUP_CHECK=PASS')
  console.log('BACKUP_WITHIN_MAXIMUM_AGE=yes')
  console.log('DATABASE_IMPORT_EXECUTED=no')
} catch (error) {
  const category = error instanceof Error ? error.message : 'unknown_error'
  fail(category)
}

function fail(message) {
  console.error(`LATEST_ENCRYPTED_BACKUP_CHECK=FAIL (${message})`)
  process.exit(1)
}
