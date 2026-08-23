import { expect, test, type Page } from "@playwright/test"

async function loginAs(
  page: Page,
  emailEnv: string,
  passwordEnv: string
) {
  const email = process.env[emailEnv]
  const password = process.env[passwordEnv]

  test.skip(
    !email || !password,
    "Configure " + emailEnv + " y " + passwordEnv + " para ejecutar esta prueba."
  )

  await page.goto("/auth/login")
  await page.locator("#login-email").fill(email as string)
  await page.locator("#login-password").fill(password as string)
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 })
}

test.describe("Formularios funcionales por rol", () => {
  test("teacher ve los formularios individual y grupal", async ({ page }) => {
    await loginAs(page, "E2E_TEACHER_EMAIL", "E2E_TEACHER_PASSWORD")

    await page.goto("/solicitudes/nueva")
    await expect(
      page.getByRole("heading", { name: "Nueva solicitud individual" })
    ).toBeVisible()
    await expect(page.locator("input[type=search]")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Enviar solicitud" })
    ).toBeVisible()

    await page.goto("/solicitudes/grupal")
    await expect(
      page.getByRole("heading", { name: "Nueva solicitud grupal" })
    ).toBeVisible()
    await expect(page.locator("select").first()).toBeVisible()
    await expect(page.getByRole("button", { name: "Enviar solicitud" })).toBeVisible()
  })

  test("student ve solo el formulario individual", async ({ page }) => {
    await loginAs(page, "E2E_STUDENT_EMAIL", "E2E_STUDENT_PASSWORD")

    await page.goto("/solicitudes/nueva")
    await expect(
      page.getByRole("heading", { name: "Nueva solicitud individual" })
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Enviar solicitud" })).toBeVisible()

    await page.goto("/solicitudes/grupal")
    await expect(page).toHaveURL(/\/solicitudes$/)
  })

  test("admin ve el formulario de préstamos", async ({ page }) => {
    await loginAs(page, "E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD")

    await page.goto("/prestamos")
    await expect(page.getByRole("heading", { name: "Gestión de Préstamos" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Registrar préstamo" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Guardar préstamo" })).toBeVisible()
  })

  test("lab_staff ve los formularios de préstamos y devoluciones", async ({ page }) => {
    await loginAs(page, "E2E_LAB_STAFF_EMAIL", "E2E_LAB_STAFF_PASSWORD")

    await page.goto("/prestamos")
    await expect(page.getByRole("heading", { name: "Registrar préstamo" })).toBeVisible()

    await page.goto("/devoluciones")
    await expect(page.getByRole("heading", { name: "Gestión de Devoluciones" })).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Registrar devolución" })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Registrar devolución" })
    ).toBeVisible()
  })
})
