'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type RegisterActionState = {
  error: string | null
}

async function persistRegistration(formData: FormData) {
  const fullName = String(formData.get('full_name') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '').trim()

  if (!fullName || !email || !password) {
    throw new Error('Todos los campos son obligatorios.')
  }

  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
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
}

export async function registerUser(formData: FormData): Promise<void> {
  await persistRegistration(formData)
  redirect('/solicitudes')
}

export async function registerUserWithState(
  _previousState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  try {
    await persistRegistration(formData)
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo crear la cuenta. Intente nuevamente.',
    }
  }

  redirect('/solicitudes')
}
