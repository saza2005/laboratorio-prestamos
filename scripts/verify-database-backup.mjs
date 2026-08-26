#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const backupDirectory = process.argv[2]

if (!backupDirectory || !path.isAbsolute(backupDirectory)) {
  fail('Debe indicar la ruta absoluta del respaldo.')
}

try {
  const directory = await stat(backupDirectory)
  if (!directory.isDirectory()) fail('La ruta indicada no es un directorio.')

  const manifestPath = path.join(backupDirectory, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const expectedFiles = manifest?.files

  if (!expectedFiles || typeof expectedFiles !== 'object') {
    fail('El manifiesto no contiene archivos verificables.')
  }

  const actualEntries = await readdir(backupDirectory)
  const allowedEntries = new Set(['manifest.json', ...Object.keys(expectedFiles)])
  const unexpectedEntries = actualEntries.filter((entry) => !allowedEntries.has(entry))
  if (unexpectedEntries.length > 0) fail('El respaldo contiene archivos inesperados.')

  for (const [filename, metadata] of Object.entries(expectedFiles)) {
    if (!isSafeFilename(filename)) fail('El manifiesto contiene una ruta no segura.')
    if (!metadata || typeof metadata.sha256 !== 'string') {
      fail('El manifiesto contiene un hash inválido.')
    }

    const filePath = path.join(backupDirectory, filename)
    const file = await stat(filePath)
    if (!file.isFile() || file.size === 0) fail('Falta un archivo o está vacío.')

    const actualHash = await sha256(filePath)
    if (actualHash !== metadata.sha256) fail('La integridad SHA-256 no coincide.')
  }

  console.log('BACKUP_INTEGRITY=PASS')
  console.log(`BACKUP_FILE_COUNT=${Object.keys(expectedFiles).length}`)
} catch (error) {
  const category = error instanceof Error ? error.message : 'unknown_error'
  fail(category)
}

function isSafeFilename(filename) {
  return filename === path.basename(filename) && filename !== '.' && filename !== '..'
}

async function sha256(file) {
  const contents = await readFile(file)
  return createHash('sha256').update(contents).digest('hex')
}

function fail(message) {
  console.error(`BACKUP_INTEGRITY=FAIL (${message})`)
  process.exit(1)
}
