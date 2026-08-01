import { expect, test } from "@playwright/test"
import {
  INSTITUTIONAL_EMAIL_DOMAIN,
  isInstitutionalEmail,
  normalizeEmail,
} from "../../lib/supabase/auth/email-policy"

test.describe("Política de correo institucional", () => {
  test("acepta correos válidos del dominio institucional", () => {
    expect(INSTITUTIONAL_EMAIL_DOMAIN).toBe("ucuenca.edu.ec")
    expect(isInstitutionalEmail("usuario@ucuenca.edu.ec")).toBe(true)
    expect(isInstitutionalEmail(" Usuario@UCUENCA.EDU.EC ")).toBe(true)
  })

  test("rechaza dominios externos o formatos incompletos", () => {
    for (const email of [
      "usuario@gmail.com",
      "usuario@ucuenca.edu.ec.ejemplo.com",
      "@ucuenca.edu.ec",
      "usuario@",
      "usuario ucuenca.edu.ec",
      "",
    ]) {
      expect(isInstitutionalEmail(email)).toBe(false)
    }
  })

  test("normaliza correo para comparaciones y persistencia", () => {
    expect(normalizeEmail(" Usuario@UCUENCA.EDU.EC ")).toBe(
      "usuario@ucuenca.edu.ec"
    )
  })
})
