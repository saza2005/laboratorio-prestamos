import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const roles = ['admin', 'lab-staff', 'teacher', 'student'] as const
const statePath = (role: string) => path.resolve('.e2e-state/playwright', role + '.json')

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results',
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: process.env.PLAYWRIGHT_NO_SERVER ? undefined : {
    command: 'node --env-file=.env.app-e2e scripts/e2e/start-app-e2e.mjs --confirm-e2e --port=3000',
    url: 'http://localhost:3000/auth/login',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    ...roles.map(role => ({
      name: 'auth-' + role,
      testMatch: /auth.setup.ts/,
      use: { ...devices['Desktop Chrome'] },
    })),
    {
      name: 'chromium-auth-ephemeral',
      testIgnore: /auth\.setup\.ts/,
      dependencies: [],
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,
        screenshot: 'off',
        trace: 'off',
        video: 'off',
      },
    },
    ...roles.map(role => ({
      name: 'chromium-' + role,
      testIgnore: /auth.setup.ts/,
      dependencies: ['auth-' + role],
      use: { ...devices['Desktop Chrome'], storageState: statePath(role) },
    })),
  ],
})
