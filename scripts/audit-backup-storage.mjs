#!/usr/bin/env node

import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const localRoot = requireAbsolutePath('DATABASE_BACKUP_DIR')
const externalRoot = optionalAbsolutePath('EXTERNAL_BACKUP_DIR')
const maximumLocalCopies = positiveInteger('BACKUP_REVIEW_LOCAL_COUNT', 90)
const maximumExternalCopies = positiveInteger('BACKUP_REVIEW_EXTERNAL_COUNT', 90)

try {
  const local = await inspectLocalBackups(localRoot)
  const external = externalRoot
    ? await inspectExternalBackups(externalRoot)
    : { available: false, count: 0, bytes: 0 }

  console.log(`LOCAL_BACKUP_COUNT=${local.count}`)
  console.log(`LOCAL_BACKUP_BYTES=${local.bytes}`)
  console.log(`EXTERNAL_BACKUP_AVAILABLE=${external.available ? 'yes' : 'no'}`)
  if (external.available) {
    console.log(`EXTERNAL_BACKUP_COUNT=${external.count}`)
    console.log(`EXTERNAL_BACKUP_BYTES=${external.bytes}`)
  }
  console.log('BACKUPS_DELETED=0')

  if (local.count > maximumLocalCopies) {
    fail('local_backup_review_threshold_reached')
  }
  if (external.available && external.count > maximumExternalCopies) {
    fail('external_backup_review_threshold_reached')
  }

  console.log('BACKUP_STORAGE_AUDIT=PASS')
} catch (error) {
  const category = error instanceof Error ? error.message : 'unknown_error'
  fail(category)
}

async function inspectLocalBackups(root) {
  const entries = await readdir(root, { withFileTypes: true })
  const directories = entries.filter(
    (entry) => entry.isDirectory() && !entry.name.endsWith('.partial')
  )
  let bytes = 0
  for (const directory of directories) {
    bytes += await directorySize(path.join(root, directory.name))
  }
  return { count: directories.length, bytes }
}

async function inspectExternalBackups(root) {
  try {
    const entries = await readdir(root, { withFileTypes: true })
    const files = entries.filter(
      (entry) => entry.isFile() && entry.name.endsWith('.tar.gpg')
    )
    let bytes = 0
    for (const file of files) {
      bytes += (await stat(path.join(root, file.name))).size
    }
    return { available: true, count: files.length, bytes }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { available: false, count: 0, bytes: 0 }
    }
    throw error
  }
}

async function directorySize(root) {
  const entries = await readdir(root, { withFileTypes: true })
  let bytes = 0
  for (const entry of entries) {
    const target = path.join(root, entry.name)
    if (entry.isDirectory()) bytes += await directorySize(target)
    if (entry.isFile()) bytes += (await stat(target)).size
  }
  return bytes
}

function requireAbsolutePath(name) {
  const value = process.env[name]
  if (!value || !path.isAbsolute(value)) fail(`${name} debe ser una ruta absoluta.`)
  return value
}

function optionalAbsolutePath(name) {
  const value = process.env[name]
  if (!value) return null
  if (!path.isAbsolute(value)) fail(`${name} debe ser una ruta absoluta.`)
  return value
}

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isSafeInteger(value) || value <= 0) fail(`${name} debe ser un entero positivo.`)
  return value
}

function fail(message) {
  console.error(`BACKUP_STORAGE_AUDIT=FAIL (${message})`)
  process.exit(1)
}
