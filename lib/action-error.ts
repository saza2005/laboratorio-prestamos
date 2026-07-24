const DEFAULT_ACTION_ERROR = 'No se pudo completar la acción. Intente nuevamente.'

export function getActionErrorMessage(
  error: unknown,
  fallback = DEFAULT_ACTION_ERROR
) {
  const message = error instanceof Error ? error.message.trim() : ''

  if (!message) return fallback

  return normalizeTechnicalError(message) ?? message
}

function normalizeTechnicalError(message: string) {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('schema cache') ||
    normalized.includes('could not find the function') ||
    normalized.includes('function public.')
  ) {
    return 'Falta ejecutar o actualizar una función de base de datos. Contacte al administrador.'
  }

  if (
    normalized.includes('row-level security') ||
    normalized.includes('violates row-level security') ||
    normalized.includes('permission denied')
  ) {
    return 'No tiene permisos para realizar esta acción.'
  }

  if (normalized.includes('duplicate key') || normalized.includes('unique constraint')) {
    return 'Ya existe un registro con esos datos.'
  }

  if (normalized.includes('invalid input value for enum')) {
    return 'Uno de los estados enviados no es válido. Actualice la página e intente nuevamente.'
  }

  if (normalized.includes('violates foreign key constraint')) {
    return 'El registro seleccionado ya no está disponible o fue modificado.'
  }

  if (normalized.includes('violates check constraint')) {
    return 'Los datos enviados no cumplen las reglas del sistema.'
  }

  if (normalized.includes('network') || normalized.includes('fetch failed')) {
    return 'No se pudo conectar con el servidor. Revise la conexión e intente nuevamente.'
  }

  return null
}
