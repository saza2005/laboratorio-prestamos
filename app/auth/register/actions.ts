'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type RegisterActionState = {
  error: string | null
}

async function persistRegistration(formData: FormData) {
  const fullName = String(formData.get('full_name') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')

  if (!fullName || !email || !password) {
    throw new Error('Todos los campos son obligatorios.')
  }

  if (fullName.length > 120) {
    throw new Error('El nombre completo no puede superar 120 caracteres.')
  }

  if (email.length > 254) {
    throw new Error('El correo no puede superar 254 caracteres.')
  }

  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.')
  }

  if (password.length > 128) {
    throw new Error('La contraseña no puede superar 128 caracteres.')
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      throw new Error('Ya existe una cuenta registrada con este correo.')
    }

    throw new Error(
      'No se pudo crear la cuenta. Verifique los datos e intente nuevamente.'
    )
  }

  return Boolean(data.session)
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
