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
