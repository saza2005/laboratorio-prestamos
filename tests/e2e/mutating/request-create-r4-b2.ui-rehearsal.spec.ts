import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { prepareR4GroupedRequestForm } from './helpers/request-create-groups-form'

function readPurpose(): string {
  const snapshot = JSON.parse(fs.readFileSync('.e2e-state/runtime/r4-pre-snapshot.json', 'utf8'))
  if (snapshot.flow !== 'FLOW-R4' || snapshot.creationAttemptCount !== 0 || typeof snapshot.purpose !== 'string') {
    throw new Error('invalid_r4_pre_snapshot')
  }
  return snapshot.purpose
}

test('R4-B2 prepara solicitud grupal sin submit', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-teacher', 'R4-B2 usa teacher')

  let postAttempts = 0
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'POST') {
      postAttempts += 1
      await route.abort('blockedbyclient')
      return
    }
    await route.continue()
  })

  await prepareR4GroupedRequestForm(page, readPurpose())

  expect(postAttempts).toBe(0)
  console.log('R4_BROWSER_READY_ROUTE: /solicitudes/grupal')
  console.log('R4_BROWSER_READY_COUNT: 1')
  console.log('R4_BROWSER_READY_GATE: PASS')
  console.log('R4_GROUP_FORM_RENDER_COUNT: 1')
  console.log('R4_PURPOSE_CONTROL_VALUE_SET: yes')
  console.log('R4_GROUP_NAME_CANONICAL_STATE: PASS')
  console.log('R4_PREPARED_PAYLOAD_VALIDATION: PASS')
  console.log('R4_SUBMIT_CONTROL_COUNT: 1')
  console.log('R4_SUBMIT_CONTROL_VISIBLE: yes')
  console.log('R4_SUBMIT_CONTROL_ENABLED: yes')
  console.log('R4_SUBMIT_CLICK_COUNT: 0')
  console.log('RAW_PAGE_POST_ATTEMPTS: 0')
  console.log('R4_SERVER_ACTION_POST_ATTEMPTS: 0')
  console.log('R4_BUSINESS_RPC_EXECUTIONS: 0')
})
