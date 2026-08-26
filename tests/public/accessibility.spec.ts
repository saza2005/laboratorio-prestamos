import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const publicPages = [
  { path: "/", name: "portada" },
  { path: "/auth/login", name: "inicio de sesión" },
  { path: "/auth/register", name: "registro institucional" },
]

test.describe("Accesibilidad de pantallas públicas", () => {
  for (const publicPage of publicPages) {
    test(`${publicPage.name} cumple WCAG A/AA automatizable`, async ({ page }) => {
      await page.goto(publicPage.path)

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()

      expect(results.violations).toEqual([])
    })
  }
})
