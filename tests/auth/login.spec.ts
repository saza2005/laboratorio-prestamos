import { expect, test } from "@playwright/test"

const protectedRoutes = [
  "/dashboard",
  "/dashboard/solicitudes",
  "/inventario",
  "/prestamos",
  "/devoluciones",
  "/mantenimiento",
  "/solicitudes",
  "/solicitudes/nueva",
  "/solicitudes/grupal",
  "/solicitudes/mis-solicitudes",
  "/solicitudes/mis-prestamos",
]

test.describe("Autenticación y protección de rutas", () => {
  test("muestra el formulario de inicio de sesión", async ({ page }) => {
    await page.goto("/auth/login")

    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible()
    await expect(page.locator("#login-email")).toBeVisible()
    await expect(page.locator("#login-password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Entrar con Google institucional" })
    ).toBeVisible()
  })

  test("redirige todas las rutas protegidas al login cuando no hay sesión", async ({ page }) => {
    for (const route of protectedRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL(new RegExp("/auth/login"))
    }
  })

  test("muestra los mensajes de seguridad del acceso institucional", async ({ page }) => {
    await page.goto("/auth/login?error=invalid_domain")
    await expect(
      page.getByText("Solo se permite el acceso con cuentas @ucuenca.edu.ec.")
    ).toBeVisible()

    await page.goto("/auth/login?error=password_login_disabled")
    await expect(
      page.getByText("El acceso con contraseña está reservado para administradores y laboratoristas.")
    ).toBeVisible()
  })

  test("muestra un error controlado con credenciales vacías", async ({ page }) => {
    await page.goto("/auth/login?error=missing_credentials")

    await expect(
      page.getByText("Debe ingresar correo y contraseña.")
    ).toBeVisible()
  })
})
