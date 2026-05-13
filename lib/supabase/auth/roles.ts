export type AppRole =
  | 'admin'
  | 'lab_staff'
  | 'teacher'
  | 'student'

export function canManageInventory(role?: string | null) {
  return role === 'admin' || role === 'lab_staff'
}

export function canManageLoans(role?: string | null) {
  return role === 'admin' || role === 'lab_staff'
}

export function canManageReturns(role?: string | null) {
  return role === 'admin' || role === 'lab_staff'
}

export function canViewOperationalDashboard(role?: string | null) {
  return role === 'admin' || role === 'lab_staff'
}

export function canUseRequestPortal(role?: string | null) {
  return role === 'teacher' || role === 'student'
}

export function getHomeRouteByRole(role?: string | null) {
  if (role === 'admin' || role === 'lab_staff') {
    return '/dashboard'
  }

  if (role === 'teacher' || role === 'student') {
    return '/solicitudes'
  }

  return '/auth/login'
}

export function canSeeInventoryModule(role?: string | null) {
  return role === 'admin' || role === 'lab_staff'
}

export function canSeeLoansModule(role?: string | null) {
  return role === 'admin' || role === 'lab_staff'
}

export function canSeeReturnsModule(role?: string | null) {
  return role === 'admin' || role === 'lab_staff'
}

export function canSeeReportsModule(role?: string | null) {
  return role === 'admin' || role === 'lab_staff'
}