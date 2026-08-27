import { expect, test, type Page } from "@playwright/test"

function observeSecurityErrors(page: Page) {
  const cspViolations: string[] = []
  const pageErrors: string[] = []

  page.on("console", (message) => {
    const value = message.text()
    if (
      /content security policy/i.test(value) ||
      /violat(?:es|ion).*directive/i.test(value) ||
      /refused to (?:apply|connect|execute|load)/i.test(value)
    ) {
      cspViolations.push("CSP violation observed")
    }
  })

  page.on("pageerror", () => {
    pageErrors.push("Unexpected page error observed")
  })

  return { cspViolations, pageErrors }
}

for (const route of ["/", "/auth/login"] as const) {
  test(`CSP pública sin violaciones en ${route}`, async ({ page }) => {
    const observations = observeSecurityErrors(page)
    const response = await page.goto(route)

    expect(response?.ok()).toBeTruthy()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    expect(observations.cspViolations).toEqual([])
    expect(observations.pageErrors).toEqual([])
  })
}
