#!/usr/bin/env node

import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const stateDirectory = path.join(os.homedir(), '.local', 'state', 'laboratorio-prestamos')
const logPath = path.join(stateDirectory, 'secret-rotation-reminders.log')
const timestamp = new Date().toISOString()

await mkdir(stateDirectory, { recursive: true, mode: 0o700 })
await appendFile(logPath, `${timestamp} SECRET_ROTATION_REVIEW_DUE=yes\n`, {
  encoding: 'utf8',
  mode: 0o600,
})

console.log('SECRET_ROTATION_REVIEW_DUE=yes')
console.log('SECRET_VALUES_ACCESSED=no')
