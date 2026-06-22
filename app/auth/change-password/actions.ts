'use server'

import { createClient } from '@/lib/supabase/server'

export type ChangePasswordState = {
  error: string | null
  success: string | null
}

export async function changePasswordWithState(
  _previousState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const currentPassword = String(formData.get('current_password') || '')
  const newPassword = String(formData.get('new_password') || '')
  const confirmPassword = String(formData.get('confirm_password') || '')

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'Todos los campos son obligatorios.', success: null }
  }

  if (newPassword.length < 6) {
    return {
      error: 'La nueva contraseña debe tener al menos 6 caracteres.',
      success: null,
    }
  }

  if (newPassword.length > 128) {
    return {
      error: 'La nueva contraseña no puede superar 128 caracteres.',
      success: null,
    }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'La confirmación no coincide con la nueva contraseña.', success: null }
  }

  if (currentPassword === newPassword) {
    return {
      error: 'La nueva contraseña debe ser diferente a la contraseña actual.',
      success: null,
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    return { error: 'Debe iniciar sesión para cambiar la contraseña.', success: null }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (signInError) {
    return { error: 'La contraseña actual no es correcta.', success: null }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return {
      error: 'No se pudo actualizar la contraseña. Intente nuevamente.',
      success: null,
    }
  }

  return { error: null, success: 'Contraseña actualizada correctamente.' }
}
