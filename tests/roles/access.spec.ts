import { expect, test } from "@playwright/test"

type RoleCase = {
  role: "admin" | "lab_staff" | "teacher" | "student"
  emailEnv: string
  passwordEnv: string
  routes: string[]
  homeRoute: string
  forbiddenRoutes: string[]
}

const roleCases: RoleCase[] = [
  {
    role: "admin",
    emailEnv: "E2E_ADMIN_EMAIL",
    passwordEnv: "E2E_ADMIN_PASSWORD",
    routes: ["/dashboard", "/dashboard/solicitudes", "/inventario", "/prestamos", "/devoluciones", "/mantenimiento"],
    homeRoute: "/dashboard",
    forbiddenRoutes: ["/solicitudes"],
  },
  {
    role: "lab_staff",
    emailEnv: "E2E_LAB_STAFF_EMAIL",
    passwordEnv: "E2E_LAB_STAFF_PASSWORD",
    routes: ["/dashboard", "/dashboard/solicitudes", "/inventario", "/prestamos", "/devoluciones", "/mantenimiento"],
    homeRoute: "/dashboard",
    forbiddenRoutes: ["/solicitudes"],
  },
  {
    role: "teacher",
    emailEnv: "E2E_TEACHER_EMAIL",
    passwordEnv: "E2E_TEACHER_PASSWORD",
    routes: ["/solicitudes", "/solicitudes/nueva", "/solicitudes/grupal", "/solicitudes/mis-solicitudes", "/solicitudes/mis-prestamos", "/solicitudes/catalogo"],
    homeRoute: "/solicitudes",
    forbiddenRoutes: ["/dashboard", "/inventario", "/prestamos", "/devoluciones", "/mantenimiento"],
  },
  {
    role: "student",
    emailEnv: "E2E_STUDENT_EMAIL",
    passwordEnv: "E2E_STUDENT_PASSWORD",
    routes: ["/solicitudes", "/solicitudes/nueva", "/solicitudes/mis-solicitudes", "/solicitudes/mis-prestamos", "/solicitudes/catalogo"],
    homeRoute: "/solicitudes",
    forbiddenRoutes: ["/dashboard", "/inventario", "/prestamos", "/devoluciones", "/mantenimiento", "/solicitudes/grupal"],
  },
]

for (const roleCase of roleCases) {
  test.describe(roleCase.role + ": permisos y rutas", () => {
    test("puede iniciar sesión, abrir sus rutas y es redirigido en rutas no permitidas", async ({ page }) => {
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
      await expect(page).toHaveURL(new RegExp(roleCase.homeRoute.replace("/", "\\/")))

      for (const route of roleCase.routes) {
        await page.goto(route)
        await expect(page).not.toHaveURL(new RegExp("/auth/login"))
      }

      for (const route of roleCase.forbiddenRoutes) {
        await page.goto(route)
        await expect(page).toHaveURL(new RegExp(roleCase.homeRoute.replace("/", "\\/")))
      }
    })
  })
}
