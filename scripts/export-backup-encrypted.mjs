#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const backupRoot = process.env.DATABASE_BACKUP_DIR
const externalRoot = process.env.EXTERNAL_BACKUP_DIR
const externalMount = process.env.EXTERNAL_BACKUP_MOUNT
const passphraseFile = process.env.BACKUP_PASSPHRASE_FILE

if (!backupRoot || !path.isAbsolute(backupRoot)) fail('DATABASE_BACKUP_DIR debe ser una ruta absoluta.')
if (!externalRoot || !path.isAbsolute(externalRoot)) skip('external_destination_not_configured')
if (!externalMount || !path.isAbsolute(externalMount)) skip('external_mount_not_configured')
if (!passphraseFile || !path.isAbsolute(passphraseFile)) skip('passphrase_file_not_configured')

try {
  requireMountedDestination(externalMount, externalRoot)
  const sourceDirectory = await newestVerifiedBackup(backupRoot)
  await requirePrivatePassphrase(passphraseFile)
  await mkdir(externalRoot, { recursive: true })

  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'laboratorio-backup-'))
  const temporaryArchive = path.join(temporaryDirectory, 'backup.tar.gz')

  const archiveName = `${path.basename(sourceDirectory)}.tar.gpg`
  const finalArchive = path.join(externalRoot, archiveName)
  const partialArchive = `${finalArchive}.partial`
  const checksumFile = `${finalArchive}.sha256`
  const partialChecksum = `${checksumFile}.partial`

  await rm(partialArchive, { force: true })
  await rm(partialChecksum, { force: true })

  try {
    const tar = spawnSync(
      'tar',
      ['-C', backupRoot, '-czf', temporaryArchive, path.basename(sourceDirectory)],
      { encoding: 'utf8' }
    )
    if (tar.status !== 0) throw new Error('backup_archive_failed')

    const encrypted = spawnSync(
      'gpg',
      [
        '--batch', '--yes', '--pinentry-mode', 'loopback',
        '--passphrase-file', passphraseFile,
        '--symmetric', '--cipher-algo', 'AES256',
        '--output', partialArchive, temporaryArchive,
      ],
      { encoding: 'utf8' }
    )
    if (encrypted.status !== 0) throw new Error('backup_encryption_failed')

    const verified = spawnSync(
      'gpg',
      [
        '--batch', '--quiet', '--pinentry-mode', 'loopback',
        '--passphrase-file', passphraseFile,
        '--decrypt', '--output', '/dev/null', partialArchive,
      ],
      { encoding: 'utf8' }
    )
    if (verified.status !== 0) throw new Error('encrypted_backup_verification_failed')

    const checksum = await sha256(partialArchive)
    await writeFile(partialChecksum, `${checksum}  ${archiveName}\n`, { mode: 0o600 })
    await rename(partialArchive, finalArchive)
    await rename(partialChecksum, checksumFile)
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }

  console.log('EXTERNAL_BACKUP_STATUS=PASS')
  console.log('EXTERNAL_BACKUP_ENCRYPTION=AES256')
} catch (error) {
  const category = error instanceof Error ? error.message : 'unknown_error'
  fail(category)
}

async function newestVerifiedBackup(root) {
  const entries = await readdir(root, { withFileTypes: true })
  const candidates = entries
    .filter((entry) => entry.isDirectory() && !entry.name.endsWith('.partial'))
    .map((entry) => entry.name)
    .sort()
    .reverse()

  for (const candidate of candidates) {
    const directory = path.join(root, candidate)
    const verify = spawnSync(
      process.execPath,
      [path.join(import.meta.dirname, 'verify-database-backup.mjs'), directory],
      { encoding: 'utf8' }
    )
    if (verify.status === 0) return directory
  }

  throw new Error('verified_backup_not_found')
}

function requireMountedDestination(mount, destination) {
  const relativeDestination = path.relative(mount, destination)
  if (relativeDestination.startsWith('..') || path.isAbsolute(relativeDestination)) {
    throw new Error('external_destination_outside_mount')
  }

  const mounted = spawnSync('findmnt', ['--mountpoint', mount, '--noheadings'], { encoding: 'utf8' })
  if (mounted.status !== 0) skip('external_device_not_mounted')
}

async function requirePrivatePassphrase(file) {
  const metadata = await stat(file)
  if (!metadata.isFile() || metadata.size < 20) throw new Error('passphrase_file_invalid')
  if ((metadata.mode & 0o077) !== 0) throw new Error('passphrase_file_permissions_must_be_600')
}

async function sha256(file) {
  const contents = await readFile(file)
  return createHash('sha256').update(contents).digest('hex')
}

function skip(reason) {
  console.log(`EXTERNAL_BACKUP_STATUS=SKIPPED (${reason})`)
  process.exit(0)
}

function fail(message) {
  console.error(`EXTERNAL_BACKUP_STATUS=FAIL (${message})`)
  process.exit(1)
}
