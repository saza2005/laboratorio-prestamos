#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const encryptedArchive = process.argv[2]
const passphraseFile = process.env.BACKUP_PASSPHRASE_FILE

if (!encryptedArchive || !path.isAbsolute(encryptedArchive)) {
  fail('Debe indicar la ruta absoluta del respaldo cifrado.')
}
if (!passphraseFile || !path.isAbsolute(passphraseFile)) {
  fail('BACKUP_PASSPHRASE_FILE debe ser una ruta absoluta.')
}

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'laboratorio-restore-check-'))
const decryptedArchive = path.join(temporaryDirectory, 'backup.tar.gz')
const extractedDirectory = path.join(temporaryDirectory, 'extracted')

try {
  await requireReadableFile(encryptedArchive)
  await requirePrivatePassphrase(passphraseFile)

  const decrypted = spawnSync(
    'gpg',
    [
      '--batch', '--quiet', '--pinentry-mode', 'loopback',
      '--passphrase-file', passphraseFile,
      '--decrypt', '--output', decryptedArchive, encryptedArchive,
    ],
    { encoding: 'utf8' }
  )
  if (decrypted.status !== 0) throw new Error('encrypted_backup_decryption_failed')

  const listed = spawnSync('tar', ['-tzf', decryptedArchive], { encoding: 'utf8' })
  if (listed.status !== 0) throw new Error('encrypted_backup_archive_invalid')

  const entries = listed.stdout.split('\n').filter(Boolean)
  if (entries.length === 0 || entries.some(isUnsafeArchiveEntry)) {
    throw new Error('encrypted_backup_archive_unsafe')
  }

  await mkdir(extractedDirectory, { mode: 0o700 })
  const extracted = spawnSync(
    'tar',
    ['-xzf', decryptedArchive, '-C', extractedDirectory, '--no-same-owner', '--no-same-permissions'],
    { encoding: 'utf8' }
  )
  if (extracted.status !== 0) throw new Error('encrypted_backup_extraction_failed')

  const roots = (await readdir(extractedDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
  if (roots.length !== 1) throw new Error('encrypted_backup_root_invalid')

  const backupDirectory = path.join(extractedDirectory, roots[0].name)
  const verified = spawnSync(
    process.execPath,
    [path.join(import.meta.dirname, 'verify-database-backup.mjs'), backupDirectory],
    { encoding: 'utf8' }
  )
  if (verified.status !== 0) throw new Error('encrypted_backup_contents_invalid')

  console.log('ENCRYPTED_BACKUP_RECOVERY_CHECK=PASS')
  console.log('DATABASE_IMPORT_EXECUTED=no')
} catch (error) {
  const category = error instanceof Error ? error.message : 'unknown_error'
  console.error(`ENCRYPTED_BACKUP_RECOVERY_CHECK=FAIL (${category})`)
  process.exitCode = 1
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}

function isUnsafeArchiveEntry(entry) {
  if (path.isAbsolute(entry)) return true
  return entry.split('/').some((segment) => segment === '..')
}

async function requireReadableFile(file) {
  const metadata = await stat(file)
  if (!metadata.isFile() || metadata.size === 0) throw new Error('encrypted_backup_file_invalid')
}

async function requirePrivatePassphrase(file) {
  const metadata = await stat(file)
  if (!metadata.isFile() || metadata.size < 20) throw new Error('passphrase_file_invalid')
  if ((metadata.mode & 0o077) !== 0) throw new Error('passphrase_file_permissions_must_be_600')
}

function fail(message) {
  console.error(`ENCRYPTED_BACKUP_RECOVERY_CHECK=FAIL (${message})`)
  process.exit(1)
}
