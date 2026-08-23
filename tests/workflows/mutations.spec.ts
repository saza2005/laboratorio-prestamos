import { expect, test, type Page } from "@playwright/test"

async function loginAsStudent(page: Page) {
  const email = process.env.E2E_STUDENT_EMAIL
  const password = process.env.E2E_STUDENT_PASSWORD

  test.skip(
    process.env.E2E_MUTATIONS !== "true" || !email || !password || !process.env.E2E_ITEM_CODE,
    "Requiere E2E_MUTATIONS=true, credenciales de student y E2E_ITEM_CODE."
  )

  await page.goto("/auth/login")
  await page.locator("#login-email").fill(email as string)
  await page.locator("#login-password").fill(password as string)
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 })
}

test.describe("Flujo mutacional individual", () => {
  test("crea y cancela una solicitud E2E sin afectar el stock", async ({ page }) => {
    await loginAsStudent(page)

    const itemCode = process.env.E2E_ITEM_CODE as string
    const purpose = "E2E solicitud " + Date.now()

    await page.goto("/solicitudes/nueva")
    await page
      .getByPlaceholder("Práctica de laboratorio / clase / proyecto")
      .fill(purpose)

    const search = page.getByPlaceholder(
      "Buscar por nombre, código interno, código patrimonial o categoría"
    )
    await search.fill(itemCode)

    const itemResult = page.getByRole("button").filter({ hasText: itemCode })
    await expect(itemResult.first()).toBeVisible()
    await itemResult.first().click()

    const submit = page.getByRole("button", { name: "Enviar solicitud" })
    await expect(submit).toBeEnabled()
    await submit.click()
    await expect(page).toHaveURL(/\/solicitudes$/)

    await page.goto("/solicitudes/mis-solicitudes")
    const requestSearch = page.getByPlaceholder(
      "Buscar por propósito, ítem, código o tipo"
    )
    await requestSearch.fill(purpose)

    const requestRow = page.getByRole("button").filter({ hasText: purpose })
    await expect(requestRow.first()).toBeVisible()
    await requestRow.first().click()

    await page.getByRole("button", { name: "Cancelar solicitud", exact: true }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog
      .getByRole("button", { name: "Cancelar solicitud", exact: true })
      .click()

    await expect(page).toHaveURL(/\/solicitudes$/)
    await page.goto("/solicitudes/mis-solicitudes")
    await requestSearch.fill(purpose)
    await requestRow.first().click()
    await expect(page.getByText("Cancelada", { exact: true })).toBeVisible()
  })
})
