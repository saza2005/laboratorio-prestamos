'use server'

import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import {
  type AssignableUserRole,
  canManageUsers,
  isAssignableUserRole,
} from '@/lib/supabase/auth/roles'

export type UpdateUserRoleState = {
  error: string | null
  success: string | null
  role: AssignableUserRole | null
}

export async function updateUserRole(
  previousState: UpdateUserRoleState,
  formData: FormData
): Promise<UpdateUserRoleState> {
  try {
    const { supabase, user, profile } = await getAuthProfile()

    if (!canManageUsers(profile.role)) {
      throw new Error('No tiene permisos para administrar roles.')
    }

    const profileId = String(formData.get('profile_id') ?? '').trim()
    const nextRole = String(formData.get('role') ?? '').trim()

    if (!profileId) {
      throw new Error('El usuario seleccionado no es válido.')
    }

    if (!isAssignableUserRole(nextRole)) {
      throw new Error('El rol seleccionado no está permitido.')
    }

    if (profileId === user.id) {
      throw new Error('No puede modificar su propio rol.')
    }

    const { data: target, error: targetError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', profileId)
      .maybeSingle()

    if (targetError || !target) {
      throw new Error('No se pudo identificar el usuario seleccionado.')
    }

    if (target.role === 'admin') {
      throw new Error('Las cuentas administradoras están protegidas.')
    }

    if (target.role === nextRole) {
      return {
        error: null,
        success: 'El usuario ya tiene el rol seleccionado.',
        role: nextRole,
      }
    }

    const { error } = await supabase.rpc('update_profile_role', {
      p_profile_id: profileId,
      p_role: nextRole,
    })

    if (error) {
      throw new Error('No se pudo actualizar el rol del usuario.')
    }

    return {
      error: null,
      success: 'Rol actualizado correctamente.',
      role: nextRole,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el rol del usuario.',
      success: null,
      role: previousState.role,
    }
  }
}
