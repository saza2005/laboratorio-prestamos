import { expect, test } from "@playwright/test"

type RoleCase = {
  role: "admin" | "lab_staff"
  emailEnv: string
  passwordEnv: string
  routes: string[]
}

const roleCases: RoleCase[] = [
  {
    role: "admin",
    emailEnv: "E2E_ADMIN_EMAIL",
    passwordEnv: "E2E_ADMIN_PASSWORD",
    routes: ["/dashboard", "/dashboard/solicitudes", "/inventario", "/prestamos", "/devoluciones", "/mantenimiento"],
  },
  {
    role: "lab_staff",
    emailEnv: "E2E_LAB_STAFF_EMAIL",
    passwordEnv: "E2E_LAB_STAFF_PASSWORD",
    routes: ["/dashboard", "/dashboard/solicitudes", "/inventario", "/prestamos", "/devoluciones", "/mantenimiento"],
  },
]

for (const roleCase of roleCases) {
  test.describe(roleCase.role + ": acceso a módulos administrativos", () => {
    test("puede iniciar sesión y abrir sus rutas principales", async ({ page }) => {
      const email = process.env[roleCase.emailEnv]
      const password = process.env[roleCase.passwordEnv]

      test.skip(
        !email || !password,
        "Configure " + roleCase.emailEnv + " y " + roleCase.passwordEnv + " para ejecutar esta prueba."
      )

      await page.goto("/auth/login")
      await page.locator("#login-email").fill(email as string)
      await page.locator("#login-password").fill(password as string)
      await page.getByRole("button", { name: "Entrar", exact: true }).click()
      await expect(page).not.toHaveURL(new RegExp("/auth/login"))

      for (const route of roleCase.routes) {
        await page.goto(route)
        await expect(page).not.toHaveURL(new RegExp("/auth/login"))
      }
    })
  })
}
