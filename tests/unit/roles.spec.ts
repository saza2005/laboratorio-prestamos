import { expect, test } from "@playwright/test"
import {
  canCreateGroupRequests,
  canManageInventory,
  canManageLoans,
  canManageReturns,
  canSeeInventoryModule,
  canSeeLoansModule,
  canSeeReportsModule,
  canSeeReturnsModule,
  canUseRequestPortal,
  canViewOperationalDashboard,
  getHomeRouteByRole,
} from "../../lib/supabase/auth/roles"

test.describe("Matriz de permisos por rol", () => {
  test("admin y lab_staff pueden usar los módulos operativos", () => {
    for (const role of ["admin", "lab_staff"]) {
      expect(canManageInventory(role)).toBe(true)
      expect(canManageLoans(role)).toBe(true)
      expect(canManageReturns(role)).toBe(true)
      expect(canViewOperationalDashboard(role)).toBe(true)
      expect(canSeeInventoryModule(role)).toBe(true)
      expect(canSeeLoansModule(role)).toBe(true)
      expect(canSeeReturnsModule(role)).toBe(true)
      expect(canSeeReportsModule(role)).toBe(true)
      expect(canUseRequestPortal(role)).toBe(false)
      expect(canCreateGroupRequests(role)).toBe(false)
      expect(getHomeRouteByRole(role)).toBe("/dashboard")
    }
  })

  test("teacher puede usar solicitudes grupales, pero no módulos operativos", () => {
    expect(canUseRequestPortal("teacher")).toBe(true)
    expect(canCreateGroupRequests("teacher")).toBe(true)
    expect(canManageInventory("teacher")).toBe(false)
    expect(canManageLoans("teacher")).toBe(false)
    expect(canManageReturns("teacher")).toBe(false)
    expect(canViewOperationalDashboard("teacher")).toBe(false)
    expect(getHomeRouteByRole("teacher")).toBe("/solicitudes")
  })

  test("student puede usar solicitudes individuales, pero no crear grupos", () => {
    expect(canUseRequestPortal("student")).toBe(true)
    expect(canCreateGroupRequests("student")).toBe(false)
    expect(canManageInventory("student")).toBe(false)
    expect(canManageLoans("student")).toBe(false)
    expect(canManageReturns("student")).toBe(false)
    expect(canViewOperationalDashboard("student")).toBe(false)
    expect(getHomeRouteByRole("student")).toBe("/solicitudes")
  })

  test("roles ausentes o inválidos no reciben permisos", () => {
    for (const role of [undefined, null, "", "unknown"]) {
      expect(canManageInventory(role)).toBe(false)
      expect(canUseRequestPortal(role)).toBe(false)
      expect(canCreateGroupRequests(role)).toBe(false)
      expect(getHomeRouteByRole(role)).toBe("/auth/login")
    }
  })
})
