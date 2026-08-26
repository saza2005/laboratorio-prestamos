#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const databaseUrl = process.env.DATABASE_URL
const backupRoot = process.env.DATABASE_BACKUP_DIR

if (!databaseUrl) fail('DATABASE_URL no está configurada.')
if (!backupRoot || !path.isAbsolute(backupRoot)) {
  fail('DATABASE_BACKUP_DIR debe ser una ruta absoluta.')
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '_UTC')
const finalDirectory = path.join(backupRoot, timestamp)
const partialDirectory = `${finalDirectory}.partial`

await mkdir(backupRoot, { recursive: true, mode: 0o700 })
await chmod(backupRoot, 0o700)
await mkdir(partialDirectory, { mode: 0o700 })

try {
  const schemaFile = path.join(partialDirectory, 'public-schema.sql')
  const dataFile = path.join(partialDirectory, 'public-data.sql')

  dump(['--schema', 'public', '--file', schemaFile])
  dump(['--schema', 'public', '--data-only', '--use-copy', '--file', dataFile])

  await Promise.all([chmod(schemaFile, 0o600), chmod(dataFile, 0o600)])

  const [schemaHash, dataHash] = await Promise.all([sha256(schemaFile), sha256(dataFile)])
  const manifest = {
    createdAt: new Date().toISOString(),
    scope: 'public schema and public data',
    includesSupabaseAuthUsers: false,
    files: {
      'public-schema.sql': { sha256: schemaHash },
      'public-data.sql': { sha256: dataHash },
    },
  }

  const manifestFile = path.join(partialDirectory, 'manifest.json')
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })
  await rename(partialDirectory, finalDirectory)
  console.log(`BACKUP_STATUS=PASS`)
  console.log(`BACKUP_DIRECTORY=${finalDirectory}`)
  console.log('BACKUP_SCOPE=PUBLIC_SCHEMA_AND_DATA')
  console.log('AUTH_USERS_INCLUDED=no')
} catch (error) {
  await rm(partialDirectory, { recursive: true, force: true })
  const category = error instanceof Error ? error.message : 'unknown_error'
  fail(category)
}

function dump(extraArguments) {
  const result = spawnSync(
    'supabase',
    ['db', 'dump', '--db-url', databaseUrl, ...extraArguments],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  )

  if (result.status !== 0) {
    throw new Error('supabase_db_dump_failed')
  }
}

async function sha256(file) {
  const contents = await readFile(file)
  return createHash('sha256').update(contents).digest('hex')
}

function fail(message) {
  console.error(`BACKUP_STATUS=FAIL (${message})`)
  process.exit(1)
}
