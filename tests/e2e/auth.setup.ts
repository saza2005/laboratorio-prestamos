import { expect, test as base } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

type Role = 'admin' | 'lab_staff' | 'teacher' | 'student'
const roleByProject: Record<string, { role: Role; file: string; email: string; password: string; route: string; label: string; roleText: string }> = {
  'auth-admin': { role: 'admin', file: 'admin.json', email: 'E2E_ADMIN_EMAIL', password: 'E2E_ADMIN_PASSWORD', route: '/dashboard', label: 'Administrador', roleText: 'Rol: Administrador' },
  'auth-lab-staff': { role: 'lab_staff', file: 'lab-staff.json', email: 'E2E_LAB_STAFF_EMAIL', password: 'E2E_LAB_STAFF_PASSWORD', route: '/dashboard', label: 'Laboratorista', roleText: 'Rol: Laboratorista' },
  'auth-teacher': { role: 'teacher', file: 'teacher.json', email: 'E2E_TEACHER_EMAIL', password: 'E2E_TEACHER_PASSWORD', route: '/solicitudes', label: 'Docente', roleText: 'Docente' },
  'auth-student': { role: 'student', file: 'student.json', email: 'E2E_STUDENT_EMAIL', password: 'E2E_STUDENT_PASSWORD', route: '/solicitudes', label: 'Estudiante', roleText: 'Estudiante' },
}

const test = base.extend({})
test('create isolated auth state', async ({ page }, testInfo) => {
  const config = roleByProject[testInfo.project.name]
  if (!config) throw new Error('Unsupported auth setup project')
  const email = process.env[config.email]
  const password = process.env[config.password]
  if (!email || !password) throw new Error('Missing auth setup environment')
  const stateFile = path.resolve('.e2e-state/playwright', config.file)
  if (fs.existsSync(stateFile)) throw new Error('Refusing to overwrite existing storageState')

  await page.goto('/auth/login')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL(new RegExp(config.route.replace('/', '\\/')))
  await expect(page.getByText(config.roleText, { exact: true })).toBeVisible()
  await expect(page).not.toHaveURL(/\/auth\/login/)
  await page.context().storageState({ path: stateFile })
  fs.chmodSync(stateFile, 0o600)
})
