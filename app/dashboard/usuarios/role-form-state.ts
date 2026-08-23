import type { AssignableUserRole } from '@/lib/supabase/auth/roles'

export type RoleFormViewState = {
  confirmedRole: AssignableUserRole
  selectedRole: AssignableUserRole
  hasActionConfirmation: boolean
}

export type RoleFormViewEvent =
  | { type: 'select'; role: AssignableUserRole }
  | { type: 'action_confirmed'; role: AssignableUserRole }
  | { type: 'server_prop'; role: AssignableUserRole }

export function createRoleFormViewState(
  role: AssignableUserRole
): RoleFormViewState {
  return {
    confirmedRole: role,
    selectedRole: role,
    hasActionConfirmation: false,
  }
}

export function roleFormViewReducer(
  state: RoleFormViewState,
  event: RoleFormViewEvent
): RoleFormViewState {
  if (event.type === 'select') {
    return { ...state, selectedRole: event.role }
  }

  if (event.type === 'action_confirmed') {
    return {
      confirmedRole: event.role,
      selectedRole: event.role,
      hasActionConfirmation: true,
    }
  }

  if (state.hasActionConfirmation) {
    return state
  }

  return {
    ...state,
    confirmedRole: event.role,
    selectedRole:
      state.selectedRole === state.confirmedRole
        ? event.role
        : state.selectedRole,
  }
}
