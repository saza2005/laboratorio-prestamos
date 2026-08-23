'use server'

import { createClient } from '@/lib/supabase/server'
import {
  hasPasswordIdentity,
  validatePasswordChange,
} from '@/lib/supabase/auth/password-change'

export type ChangePasswordState = {
  success: boolean
  message: string
}

export async function changeOwnPassword(
  _previousState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    return { success: false, message: 'La sesión no es válida.' }
  }

  if (!hasPasswordIdentity(user.identities)) {
    return {
      success: false,
      message: 'Esta cuenta utiliza un proveedor externo y no tiene contraseña local.',
    }
  }

  const currentPassword = String(formData.get('current_password') ?? '')
  const newPassword = String(formData.get('new_password') ?? '')
  const confirmPassword = String(formData.get('confirm_password') ?? '')
  const validationError = validatePasswordChange({
    currentPassword,
    newPassword,
    confirmPassword,
  })

  if (validationError) {
    return { success: false, message: validationError }
  }

  const { error: reauthenticationError } =
    await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

  if (reauthenticationError) {
    return { success: false, message: 'La contraseña actual no es correcta.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return {
      success: false,
      message: 'No se pudo actualizar la contraseña. Inténtelo nuevamente.',
    }
  }

  return { success: true, message: 'Contraseña actualizada correctamente.' }
}
