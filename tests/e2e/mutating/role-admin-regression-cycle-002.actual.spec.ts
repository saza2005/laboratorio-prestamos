import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { createAdminReadClient } from '../../../scripts/e2e/lib/mutating-remote.mjs'

type Role = 'admin' | 'lab_staff' | 'teacher' | 'student'
type ProfileState = { id: string; role: Role; is_active: boolean }
type Tracker = {
  status: string
  targetId: string
  adminId: string
  originalRole: 'student'
  originalActive: true
  baselineProfiles: ProfileState[]
  positiveWriteCount: number
  cleanupWriteCount: number
  negativeCheckCount: number
  pendingCleanup: boolean
  pendingRecovery: boolean
}

const root = '/home/saza/Proyectos/laboratorio-prestamos-e2e'
const trackerPath = path.resolve(process.env.E2E_ROLE_TRACKER_PATH ?? '')
const protocolPath = path.resolve(process.env.E2E_ROLE_PROTOCOL_PATH ?? '')
const expectedNegativeChecks = 9
const roleLabel: Record<Role, string> = {
  admin: 'Administrador',
  lab_staff: 'Laboratorista',
  teacher: 'Docente',
  student: 'Estudiante',
}

function readTracker(): Tracker {
  return JSON.parse(fs.readFileSync(trackerPath, 'utf8')) as Tracker
}

function writeTracker(update: Partial<Tracker>) {
  const current = readTracker()
  fs.writeFileSync(trackerPath, JSON.stringify({ ...current, ...update }, null, 2) + '\n', { mode: 0o600 })
  fs.chmodSync(trackerPath, 0o600)
}

function audit(marker: string) {
  fs.appendFileSync(protocolPath, JSON.stringify({ sequence: `${Date.now()}-${process.hrtime.bigint()}`, actor: 'PLAYWRIGHT', marker }) + '\n', { mode: 0o600 })
}

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`missing_${name.toLowerCase()}`)
  return value
}

async function signedInClient(emailName: string, passwordName: string) {
  const client = createClient(required('NEXT_PUBLIC_SUPABASE_URL'), required('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email: required(emailName), password: required(passwordName) })
  expect(error).toBeNull()
  expect(data.user).toBeTruthy()
  return { client, userId: data.user!.id }
}

async function profiles(client: SupabaseClient): Promise<ProfileState[]> {
  const { data, error } = await client.from('profiles').select('id,role,is_active').order('id')
  expect(error).toBeNull()
  return (data ?? []) as ProfileState[]
}

async function verifyExactRemoteState(expectedRole: Role) {
  const tracker = readTracker()
  const current = await profiles(createAdminReadClient())
  const target = current.find((profile) => profile.id === tracker.targetId)
  expect(target).toEqual({ id: tracker.targetId, role: expectedRole, is_active: tracker.originalActive })
  expect(current.filter((profile) => profile.id !== tracker.targetId)).toEqual(
    tracker.baselineProfiles.filter((profile) => profile.id !== tracker.targetId),
  )
}

async function rejectedRoleChange(client: SupabaseClient, targetId: string, role: string, unchangedRole: Role) {
  const { error } = await client.rpc('update_profile_role', { p_profile_id: targetId, p_role: role })
  expect(error).toBeTruthy()
  await verifyExactRemoteState(unchangedRole)
  const tracker = readTracker()
  writeTracker({ negativeCheckCount: tracker.negativeCheckCount + 1 })
}

test('REGRESSION-CYCLE-002 targeted role administration', async ({ page, browser }) => {
  test.setTimeout(120_000)
  const tracker = readTracker()
  expect(process.cwd()).toBe(root)
  expect(process.env.E2E_ROLE_ATTEMPT).toBe('9')
  expect(tracker.status).toBe('ATTEMPT_STARTED_PRE_BOUNDARY')
  expect(tracker.positiveWriteCount).toBe(0)
  expect(tracker.cleanupWriteCount).toBe(0)
  expect(tracker.negativeCheckCount).toBe(0)

  for (const [state, expectedRoute] of [
    ['lab-staff.json', '/dashboard'],
    ['teacher.json', '/solicitudes'],
    ['student.json', '/solicitudes'],
  ] as const) {
    const context = await browser.newContext({ storageState: path.resolve('.e2e-state/playwright', state) })
    const deniedPage = await context.newPage()
    await deniedPage.goto('/dashboard/usuarios')
    await expect(deniedPage).toHaveURL(new RegExp(`${expectedRoute.replace('/', '\\/')}(?:$|\\?)`))
    await context.close()
    const current = readTracker()
    writeTracker({ negativeCheckCount: current.negativeCheckCount + 1 })
  }

  const student = await signedInClient('E2E_STUDENT_EMAIL', 'E2E_STUDENT_PASSWORD')
  const teacher = await signedInClient('E2E_TEACHER_EMAIL', 'E2E_TEACHER_PASSWORD')
  const labStaff = await signedInClient('E2E_LAB_STAFF_EMAIL', 'E2E_LAB_STAFF_PASSWORD')
  const admin = await signedInClient('E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD')
  expect(student.userId).toBe(tracker.targetId)
  expect(admin.userId).toBe(tracker.adminId)

  await rejectedRoleChange(labStaff.client, tracker.targetId, 'teacher', 'student')
  await rejectedRoleChange(teacher.client, tracker.targetId, 'teacher', 'student')
  await rejectedRoleChange(student.client, tracker.targetId, 'teacher', 'student')
  await rejectedRoleChange(admin.client, tracker.targetId, 'admin', 'student')
  await rejectedRoleChange(admin.client, tracker.targetId, 'arbitrary_role', 'student')

  const { error: selfDemotionError } = await admin.client.rpc('update_profile_role', {
    p_profile_id: tracker.adminId,
    p_role: 'student',
  })
  expect(selfDemotionError).toBeTruthy()
  const adminRemote = (await profiles(createAdminReadClient())).find((profile) => profile.id === tracker.adminId)
  expect(adminRemote?.role).toBe('admin')
  await verifyExactRemoteState('student')
  writeTracker({ negativeCheckCount: readTracker().negativeCheckCount + 1 })
  expect(readTracker().negativeCheckCount).toBe(expectedNegativeChecks)
  audit('NEGATIVE_AUTHORIZATION_CHECKS_COMPLETE')

  const targetEmail = required('E2E_STUDENT_EMAIL')
  await page.goto('/dashboard/usuarios')
  await expect(page).toHaveURL(/\/dashboard\/usuarios/)
  await expect(page.getByRole('heading', { name: 'Usuarios y roles' })).toBeVisible()
  await page.locator('#user-search').fill(targetEmail)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard\/usuarios\?q=/)

  const updateViaUi = async (currentRole: Role, nextRole: Role) => {
    const row = page.locator('article').filter({ hasText: targetEmail })
    await expect(row).toHaveCount(1)
    const roleSelect = row.getByRole('combobox', { name: 'Nuevo rol' })
    await expect(roleSelect).toHaveValue(currentRole)
    await roleSelect.selectOption(nextRole)
    const submitButton = row.getByRole('button', { name: 'Guardar rol', exact: true })
    await submitButton.click()
    audit(`ROLE_${nextRole.toUpperCase()}_SUBMIT_DISPATCHED`)
    await expect.poll(async () => {
      const current = await profiles(createAdminReadClient())
      return current.find((profile) => profile.id === tracker.targetId)?.role
    }, { timeout: 10_000, intervals: [100, 250, 500, 1_000] }).toBe(nextRole)
    audit(`ROLE_${nextRole.toUpperCase()}_REMOTE_MATERIALIZED`)
    await verifyExactRemoteState(nextRole)
    await expect(roleSelect).toHaveValue(nextRole)
    await expect(row.locator('p').getByText(roleLabel[nextRole], { exact: true })).toBeVisible()
    audit(`ROLE_${nextRole.toUpperCase()}_UI_SYNCHRONIZED`)
    const current = readTracker()
    const positiveWriteCount = current.positiveWriteCount + 1
    writeTracker({
      status: positiveWriteCount === 1 ? 'FIRST_IRREVERSIBLE_BOUNDARY_CROSSED' : 'POSITIVE_SEQUENCE_IN_PROGRESS',
      positiveWriteCount,
      pendingCleanup: nextRole !== tracker.originalRole,
    })
    audit(`REMOTE_ROLE_VERIFIED_${nextRole.toUpperCase()}`)
  }

  await updateViaUi('student', 'teacher')
  await updateViaUi('teacher', 'lab_staff')
  await updateViaUi('lab_staff', 'student')
  expect(readTracker().positiveWriteCount).toBe(3)
  writeTracker({ status: 'BUSINESS_SEQUENCE_COMPLETE', pendingCleanup: false })
  audit('POSITIVE_SEQUENCE_COMPLETE')
})
