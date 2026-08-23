'use client'

import { useActionState, useEffect, useReducer } from 'react'
import { updateUserRole } from './actions'
import {
  createRoleFormViewState,
  roleFormViewReducer,
} from './role-form-state'
import type { AssignableUserRole } from '@/lib/supabase/auth/roles'
import { formatUserRole, userRoleBadgeClass } from '@/lib/status-format'

const ROLE_OPTIONS: Array<{ value: AssignableUserRole; label: string }> = [
  { value: 'student', label: 'Estudiante' },
  { value: 'teacher', label: 'Profesor' },
  { value: 'lab_staff', label: 'Laboratorista' },
]

export function RoleForm({
  profileId,
  currentRole,
  isActive,
}: {
  profileId: string
  currentRole: AssignableUserRole
  isActive: boolean
}) {
  const [roleState, dispatchRole] = useReducer(
    roleFormViewReducer,
    currentRole,
    createRoleFormViewState
  )
  const [state, formAction, isPending] = useActionState(updateUserRole, {
    error: null,
    success: null,
    role: null,
  })

  useEffect(() => {
    dispatchRole({ type: 'server_prop', role: currentRole })
  }, [currentRole])

  useEffect(() => {
    if (state.role) {
      dispatchRole({ type: 'action_confirmed', role: state.role })
    }
  }, [state.role])

  return (
    <>
      <div>
        <span className="text-xs font-medium uppercase text-slate-400 lg:hidden">
          Rol actual
        </span>
        <p>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${userRoleBadgeClass(roleState.confirmedRole)}`}
          >
            {formatUserRole(roleState.confirmedRole)}
          </span>
        </p>
      </div>
      <div>
        <span className="text-xs font-medium uppercase text-slate-400 lg:hidden">
          Estado
        </span>
        <p className={isActive ? 'text-emerald-700' : 'text-slate-500'}>
          {isActive ? 'Activo' : 'Inactivo'}
        </p>
      </div>
      <div>
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="profile_id" value={profileId} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor={`role-${profileId}`}>
              Nuevo rol
            </label>
            <select
              id={`role-${profileId}`}
              name="role"
              value={roleState.selectedRole}
              onChange={(event) =>
                dispatchRole({
                  type: 'select',
                  role: event.target.value as AssignableUserRole,
                })
              }
              disabled={isPending}
              className="form-control min-w-44 text-sm disabled:cursor-not-allowed"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isPending}
              className="button-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Guardar rol'}
            </button>
          </div>
          <div aria-live="polite">
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state.success && (
              <p className="text-sm text-emerald-700">{state.success}</p>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
