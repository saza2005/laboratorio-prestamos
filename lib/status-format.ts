export function formatUserRole(role: string | null | undefined) {
  switch (role) {
    case 'admin':
      return 'Administrador'
    case 'lab_staff':
      return 'Laboratorista'
    case 'teacher':
      return 'Docente'
    case 'student':
      return 'Estudiante'
    default:
      return role ?? 'Sin rol'
  }
}

export function userRoleBadgeClass(role: string | null | undefined) {
  switch (role) {
    case 'admin':
      return 'bg-purple-50 text-purple-700 ring-purple-200'
    case 'lab_staff':
      return 'bg-blue-50 text-blue-700 ring-blue-200'
    case 'teacher':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'student':
      return 'bg-sky-50 text-sky-700 ring-sky-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

export function requestKindBadgeClass(kind: string | null | undefined) {
  switch (kind) {
    case 'Grupal':
      return 'bg-violet-50 text-violet-700 ring-violet-200'
    case 'Individual':
      return 'bg-sky-50 text-sky-700 ring-sky-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

export function formatRequestStatus(status: string | null | undefined) {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'approved':
      return 'Aprobada'
    case 'rejected':
      return 'Rechazada'
    case 'cancelled':
      return 'Cancelada'
    case 'delivered':
      return 'Entregada'
    case 'returned':
      return 'Devuelta'
    case 'partial_return':
      return 'Devolución parcial'
    case 'partial_delivery':
      return 'Entregada parcialmente'
    default:
      return status ?? '-'
  }
}

export function requestStatusBadgeClass(status: string | null | undefined) {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700'
    case 'approved':
      return 'bg-blue-100 text-blue-700'
    case 'rejected':
      return 'bg-red-100 text-red-700'
    case 'cancelled':
      return 'bg-slate-100 text-slate-700'
    case 'delivered':
      return 'bg-indigo-100 text-indigo-700'
    case 'returned':
      return 'bg-green-100 text-green-700'
    case 'partial_return':
      return 'bg-orange-100 text-orange-700'
    case 'partial_delivery':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function formatLoanStatus(status: string | null | undefined) {
  switch (status) {
    case 'active':
      return 'Activo'
    case 'returned':
      return 'Devuelto'
    case 'partial_return':
      return 'Devolución parcial'
    case 'overdue':
      return 'Vencido'
    case 'cancelled':
      return 'Cancelado'
    default:
      return status ?? '-'
  }
}

export function loanStatusBadgeClass(status: string | null | undefined) {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-700'
    case 'returned':
      return 'bg-green-100 text-green-700'
    case 'partial_return':
      return 'bg-amber-100 text-amber-700'
    case 'overdue':
      return 'bg-red-100 text-red-700'
    case 'cancelled':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function formatItemType(type: string | null | undefined) {
  switch (type) {
    case 'consumable':
      return 'Consumible'
    case 'equipment':
      return 'Equipo'
    default:
      return type ?? '-'
  }
}

export function itemTypeBadgeClass(type: string | null | undefined) {
  switch (type) {
    case 'consumable':
      return 'bg-teal-50 text-teal-700 ring-teal-200'
    case 'equipment':
      return 'bg-blue-50 text-blue-700 ring-blue-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

export function stockAvailabilityBadgeClass(stockAvailable: number | null | undefined) {
  const stock = Number(stockAvailable ?? 0)

  if (stock <= 0) {
    return 'bg-red-50 text-red-700 ring-red-200'
  }

  if (stock <= 2) {
    return 'bg-amber-50 text-amber-700 ring-amber-200'
  }

  return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
}

export function formatInventoryStatus(status: string | null | undefined) {
  switch (status) {
    case 'active':
      return 'Activo'
    case 'inactive':
      return 'Inactivo'
    case 'maintenance':
      return 'Mantenimiento'
    default:
      return status ?? '-'
  }
}

export function inventoryStatusBadgeClass(status: string | null | undefined) {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'inactive':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'maintenance':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

export function formatMaintenanceType(type: string | null | undefined) {
  switch (type) {
    case 'preventive':
      return 'Preventivo'
    case 'corrective':
      return 'Correctivo'
    default:
      return type ?? '-'
  }
}

export function maintenanceTypeBadgeClass(type: string | null | undefined) {
  switch (type) {
    case 'preventive':
      return 'bg-blue-100 text-blue-700'
    case 'corrective':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function formatUnitCondition(value: string | null | undefined) {
  switch (value) {
    case 'good':
      return 'Bueno'
    case 'damaged':
      return 'Dañado'
    case 'maintenance':
      return 'Mantenimiento'
    case 'retired':
      return 'Retirado'
    default:
      return value ?? '-'
  }
}

export function unitConditionBadgeClass(value: string | null | undefined) {
  switch (value) {
    case 'good':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'damaged':
      return 'bg-rose-50 text-rose-700 ring-rose-200'
    case 'maintenance':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'retired':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

export function formatUnitAvailability(value: string | null | undefined) {
  switch (value) {
    case 'available':
      return 'Disponible'
    case 'loaned':
      return 'Prestado'
    case 'maintenance':
      return 'Mantenimiento'
    case 'unavailable':
      return 'No disponible'
    default:
      return value ?? '-'
  }
}

export function unitAvailabilityBadgeClass(value: string | null | undefined) {
  switch (value) {
    case 'available':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'loaned':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200'
    case 'maintenance':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'unavailable':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

export function formatMovementType(type: string | null | undefined) {
  switch (type) {
    case 'loan_out':
      return 'Préstamo'
    case 'return_ok':
      return 'Devolución OK'
    case 'return_damaged':
      return 'Devuelto dañado'
    case 'return_missing':
      return 'Reportado faltante'
    case 'adjustment_up':
      return 'Ajuste positivo'
    case 'adjustment_down':
      return 'Ajuste negativo'
    default:
      return type ?? '-'
  }
}

export function movementTypeBadgeClass(type: string | null | undefined) {
  switch (type) {
    case 'loan_out':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200'
    case 'return_ok':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'return_damaged':
    case 'return_missing':
      return 'bg-rose-50 text-rose-700 ring-rose-200'
    case 'adjustment_up':
      return 'bg-teal-50 text-teal-700 ring-teal-200'
    case 'adjustment_down':
      return 'bg-orange-50 text-orange-700 ring-orange-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}
