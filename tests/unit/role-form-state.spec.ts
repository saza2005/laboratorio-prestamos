import { expect, test } from '@playwright/test'
import {
  createRoleFormViewState,
  roleFormViewReducer,
} from '@/app/dashboard/usuarios/role-form-state'

test.describe('Estado confirmado del formulario de roles', () => {
  test('soporta cambios consecutivos e ignora props stale tras confirmar', () => {
    let state = createRoleFormViewState('student')

    state = roleFormViewReducer(state, { type: 'select', role: 'teacher' })
    state = roleFormViewReducer(state, { type: 'server_prop', role: 'student' })
    expect(state.selectedRole).toBe('teacher')

    state = roleFormViewReducer(state, {
      type: 'action_confirmed',
      role: 'teacher',
    })
    expect(state.confirmedRole).toBe('teacher')
    expect(state.selectedRole).toBe('teacher')

    state = roleFormViewReducer(state, { type: 'server_prop', role: 'student' })
    expect(state.confirmedRole).toBe('teacher')
    expect(state.selectedRole).toBe('teacher')

    state = roleFormViewReducer(state, { type: 'select', role: 'lab_staff' })
    state = roleFormViewReducer(state, {
      type: 'action_confirmed',
      role: 'lab_staff',
    })
    expect(state.confirmedRole).toBe('lab_staff')
    expect(state.selectedRole).toBe('lab_staff')

    state = roleFormViewReducer(state, { type: 'server_prop', role: 'student' })
    expect(state.confirmedRole).toBe('lab_staff')
    expect(state.selectedRole).toBe('lab_staff')

    state = roleFormViewReducer(state, { type: 'select', role: 'student' })
    state = roleFormViewReducer(state, {
      type: 'action_confirmed',
      role: 'student',
    })
    expect(state.confirmedRole).toBe('student')
    expect(state.selectedRole).toBe('student')
  })
})
