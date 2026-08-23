import { expect, test } from '@playwright/test'

type SmokeConfig = { route: string; heading: string; roleText: string }

const configByProject: Record<string, SmokeConfig> = {
  'chromium-admin': { route: '/dashboard', heading: 'Dashboard del laboratorio', roleText: 'Rol: Administrador' },
  'chromium-lab-staff': { route: '/dashboard', heading: 'Dashboard del laboratorio', roleText: 'Rol: Laboratorista' },
  'chromium-teacher': { route: '/solicitudes', heading: 'Portal de laboratorio', roleText: 'Docente' },
  'chromium-student': { route: '/solicitudes', heading: 'Portal de laboratorio', roleText: 'Estudiante' },
}

test('renderiza la vista principal del rol sin mutar datos', async ({ page }, testInfo) => {
  const config = configByProject[testInfo.project.name]
  if (!config) throw new Error('Unsupported role project')
  await page.goto(config.route)
  await expect(page.getByRole('heading', { name: config.heading })).toBeVisible()
  await expect(page.getByText(config.roleText, { exact: true })).toBeVisible()
})
