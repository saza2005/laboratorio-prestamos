#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { chromium, expect } from '@playwright/test'

if (!process.argv.includes('--confirm-e2e')) fail('missing_confirm_e2e')

const baseURL = 'http://localhost:3000'
const protectedPath = '/solicitudes/catalogo'
const stateFile = path.resolve('.e2e-state/playwright/teacher.json')
if (!fs.existsSync(stateFile)) fail('missing_teacher_storage_state')

const browser = await chromium.launch({ headless: true })
let serverActionPosts = 0

try {
  const context = await browser.newContext({ baseURL, storageState: stateFile })
  context.on('request', (request) => {
    if (request.method() === 'POST' && request.headers()['next-action']) serverActionPosts += 1
  })

  const page = await context.newPage()
  await page.goto(protectedPath)
  await expect(page, 'Protected navigation must not end at login').not.toHaveURL(/\/auth\/login(?:\?.*)?$/, {
    timeout: 10_000,
  })
  await expect(
    page.getByRole('heading', { level: 1, name: 'Catálogo disponible' }),
    'Protected catalog heading must become visible',
  ).toBeVisible({ timeout: 10_000 })
  expect(serverActionPosts, 'Auth precheck must remain read-only').toBe(0)

  console.log('AUTH_ORIGIN_PRECHECK_AFTER_FIX=PASS')
  await context.close()
} finally {
  await browser.close()
}

function fail(code) {
  console.error(`AUTH_ORIGIN_PRECHECK_AFTER_FIX=FAIL (${code})`)
  process.exit(1)
}
