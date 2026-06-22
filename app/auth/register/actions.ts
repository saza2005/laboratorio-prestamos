'use server'

import { redirect } from 'next/navigation'

export type RegisterActionState = {
  error: string | null
}

async function persistRegistration(formData: FormData): Promise<never> {
  void formData

  throw new Error(
    'El registro por contraseña está deshabilitado. Use Google institucional @ucuenca.edu.ec.'
  )
}

function redirectAfterRegistration(hasSession: boolean): never {
  if (hasSession) {
    redirect('/solicitudes')
  }

  redirect('/auth/login?registered=check_email')
}

export async function registerUser(formData: FormData): Promise<void> {
  const hasSession = await persistRegistration(formData)
  redirectAfterRegistration(hasSession)
}

export async function registerUserWithState(
  _previousState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  let hasSession: boolean

  try {
    hasSession = await persistRegistration(formData)
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo crear la cuenta. Intente nuevamente.',
    }
  }

  redirectAfterRegistration(hasSession)
}
