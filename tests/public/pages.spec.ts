import { expect, test } from "@playwright/test"

test.describe("Pantallas públicas", () => {
  test("muestra la página de inicio y sus accesos principales", async ({ page }) => {
    await page.goto("/")

    await expect(
      page.getByRole("heading", { name: "Sistema de Gestión de Laboratorio" })
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/auth/login"
    )
    await expect(
      page.getByRole("link", { name: "Registro institucional" })
    ).toHaveAttribute("href", "/auth/register")
  })

  test("muestra el registro institucional y permite volver al login", async ({ page }) => {
    await page.goto("/auth/register")

    await expect(
      page.getByRole("heading", { name: "Registro institucional" })
    ).toBeVisible()
    await expect(
      page.getByText("Google institucional @ucuenca.edu.ec")
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Inicia sesión" })).toHaveAttribute(
      "href",
      "/auth/login"
    )
  })
})
